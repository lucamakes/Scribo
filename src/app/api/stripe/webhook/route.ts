import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}


async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error('No user ID in checkout session metadata');
    return;
  }

  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'pro',
      stripe_subscription_id: subscriptionId,
      subscription_end_date: null,
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update user subscription:', error);
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (userError || !user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  let status: 'free' | 'pro' | 'cancelled' = 'free';
  let endDate: string | null = null;

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    status = 'pro';
  } else if (subscription.cancel_at_period_end) {
    status = 'pro';
    // Get end date from cancel_at if available
    if (subscription.cancel_at) {
      endDate = new Date(subscription.cancel_at * 1000).toISOString();
    }
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    status = 'cancelled';
  }

  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: status,
      stripe_subscription_id: subscription.id,
      subscription_end_date: endDate,
    })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to update subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (userError || !user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'free',
      stripe_subscription_id: null,
      subscription_end_date: null,
    })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to downgrade user:', error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .single();

  if (userError || !user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  console.log(`Payment failed for user ${user.email}`);
}
