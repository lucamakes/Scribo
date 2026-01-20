import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    console.log('=== POLAR WEBHOOK RECEIVED ===');

    let event;
    try {
      event = validateEvent(body, headers, process.env.POLAR_WEBHOOK_SECRET!);
      console.log('✅ Signature verified');
      console.log('Event type:', event.type);
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        console.error('Webhook verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
      throw err;
    }

    switch (event.type) {
      case 'checkout.created':
        console.log('Checkout created:', event.data.id);
        break;

      case 'subscription.created':
        await handleSubscriptionCreated(event.data);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data);
        break;

      case 'order.paid':
        await handleOrderPaid(event.data);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleSubscriptionCreated(data: any) {
  const userId = data.metadata?.supabase_user_id;
  const customerId = data.customerId;
  const subscriptionId = data.id;

  console.log('=== SUBSCRIPTION CREATED ===');
  console.log('User ID:', userId);
  console.log('Customer ID:', customerId);
  console.log('Subscription ID:', subscriptionId);

  if (!userId) {
    console.error('No user ID in subscription metadata');
    return;
  }

  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (fetchError?.code === 'PGRST116' || !existingUser) {
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authUser?.user) {
      console.error('Failed to fetch user from auth:', authError);
      return;
    }

    await supabase.from('users').insert({
      id: userId,
      email: authUser.user.email,
      subscription_status: 'pro',
      polar_subscription_id: subscriptionId,
      polar_customer_id: customerId,
      subscription_end_date: data.currentPeriodEnd,
    });
  } else {
    await supabase
      .from('users')
      .update({
        subscription_status: 'pro',
        polar_subscription_id: subscriptionId,
        polar_customer_id: customerId,
        subscription_end_date: data.currentPeriodEnd,
      })
      .eq('id', userId);
  }

  console.log('✅ User subscription activated');
}

async function handleSubscriptionUpdated(data: any) {
  const customerId = data.customerId;
  const subscriptionId = data.id;

  console.log('=== SUBSCRIPTION UPDATED ===');
  console.log('Status:', data.status);
  console.log('Cancel at period end:', data.cancelAtPeriodEnd);

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('polar_customer_id', customerId)
    .single();

  if (userError || !user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  let status: 'free' | 'pro' | 'cancelled' = 'free';
  let endDate: string | null = null;

  if (data.status === 'active' || data.status === 'trialing') {
    status = 'pro';
    if (data.currentPeriodEnd) {
      endDate = data.currentPeriodEnd;
    }
  }

  if (data.cancelAtPeriodEnd) {
    status = 'cancelled';
    endDate = data.endsAt || data.currentPeriodEnd;
  } else if (data.status === 'canceled' || data.status === 'past_due') {
    status = 'free';
    endDate = null;
  }

  await supabase
    .from('users')
    .update({
      subscription_status: status,
      polar_subscription_id: subscriptionId,
      subscription_end_date: endDate,
    })
    .eq('id', user.id);

  console.log('✅ Subscription updated to:', status);
}

async function handleSubscriptionCanceled(data: any) {
  const customerId = data.customerId;

  console.log('=== SUBSCRIPTION CANCELED ===');

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('polar_customer_id', customerId)
    .single();

  if (userError || !user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  await supabase
    .from('users')
    .update({
      subscription_status: 'free',
      polar_subscription_id: null,
      subscription_end_date: null,
    })
    .eq('id', user.id);

  console.log('✅ User downgraded to free');
}

async function handleOrderPaid(data: any) {
  const userId = data.metadata?.supabase_user_id;
  const customerId = data.customerId;
  const subscriptionId = data.subscriptionId;

  console.log('=== ORDER PAID ===');
  console.log('User ID:', userId);
  console.log('Subscription ID:', subscriptionId);

  if (!userId || !subscriptionId) {
    console.log('No user ID or subscription ID - might be one-time purchase');
    return;
  }

  // Update user to pro status
  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'pro',
      polar_subscription_id: subscriptionId,
      polar_customer_id: customerId,
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update user:', error);
  } else {
    console.log('✅ User upgraded to pro');
  }
}
