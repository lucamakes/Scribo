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

    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Signature present:', !!signature);

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('✅ Signature verified');
      console.log('Event type:', event.type);
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
  const customerId = session.customer as string;

  console.log('=== CHECKOUT COMPLETE ===');
  console.log('User ID:', userId);
  console.log('Subscription ID:', subscriptionId);
  console.log('Customer ID:', customerId);
  console.log('Session metadata:', session.metadata);

  if (!userId) {
    console.error('No user ID in checkout session metadata');
    return;
  }

  // First check if user exists in users table
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id, email, subscription_status')
    .eq('id', userId)
    .single();

  console.log('Existing user:', existingUser);
  console.log('Fetch error:', fetchError);

  // If user doesn't exist, create them first
  if (fetchError?.code === 'PGRST116' || !existingUser) {
    console.log('User not found in users table, fetching from auth...');
    
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authUser?.user) {
      console.error('Failed to fetch user from auth:', authError);
      return;
    }

    console.log('Creating user record...');
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: authUser.user.email,
        subscription_status: 'pro',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        subscription_end_date: null,
      });

    if (insertError) {
      console.error('Failed to create user record:', insertError);
      // Try updating instead (might have been created by trigger)
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          subscription_status: 'pro',
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          subscription_end_date: null,
        })
        .eq('id', userId)
        .select();

      console.log('Update after insert fail - result:', updatedUser);
      console.log('Update after insert fail - error:', updateError);
    } else {
      console.log('✅ Successfully created user with pro status');
    }
    return;
  }

  // User exists, update their subscription
  const { data: updatedUser, error } = await supabase
    .from('users')
    .update({
      subscription_status: 'pro',
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      subscription_end_date: null,
    })
    .eq('id', userId)
    .select();

  console.log('Update result:', updatedUser);
  console.log('Update error:', error);

  if (error) {
    console.error('Failed to update user subscription:', error);
  } else {
    console.log('✅ Successfully updated user to pro');
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
    // Always track current period end for active subscriptions
    if (subscription.current_period_end) {
      endDate = new Date(subscription.current_period_end * 1000).toISOString();
    }
  }
  
  // User cancelled but still has access until period end
  if (subscription.cancel_at_period_end) {
    status = 'cancelled';
    // Use cancel_at (when access ends) or current_period_end
    const cancelTimestamp = subscription.cancel_at || subscription.current_period_end;
    if (cancelTimestamp) {
      endDate = new Date(cancelTimestamp * 1000).toISOString();
    }
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    status = 'free';
    endDate = null;
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
