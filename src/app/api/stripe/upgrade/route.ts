import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to extract period end from subscription
function getPeriodEnd(subscription: Stripe.Subscription): number {
  const sub = subscription as unknown as { current_period_end: number };
  return sub.current_period_end || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
}

/**
 * POST - Upgrade or downgrade subscription (change plan)
 * The change is scheduled for the end of the current billing period.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rateLimitResponse = await checkRateLimit(`upgrade:${ip}`, 'strict');
    if (rateLimitResponse) return rateLimitResponse;

    const { userId, newPriceId } = await request.json();

    if (!userId || !newPriceId) {
      return NextResponse.json({ error: 'Missing userId or newPriceId' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription to modify' }, { status: 400 });
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
    const currentItemId = subscription.items.data[0]?.id;

    if (!currentItemId) {
      return NextResponse.json({ error: 'Subscription item not found' }, { status: 400 });
    }

    // Schedule the plan change for the end of the current billing period
    // No immediate charge - new plan starts when current period ends
    const updatedSubscription = await stripe.subscriptions.update(user.stripe_subscription_id, {
      items: [
        {
          id: currentItemId,
          price: newPriceId,
        },
      ],
      proration_behavior: 'none', // No proration - change happens at period end
      // If they had cancelled, reactivate
      cancel_at_period_end: false,
    });

    const isYearly = newPriceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY;
    const periodEnd = getPeriodEnd(updatedSubscription);

    console.log('=== PLAN CHANGE SCHEDULED ===');
    console.log('New price ID:', newPriceId);
    console.log('Is yearly:', isYearly);
    console.log('Change effective at:', new Date(periodEnd * 1000).toISOString());

    // Update database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: 'pro',
        subscription_end_date: new Date(periodEnd * 1000).toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update database:', updateError);
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
        interval: isYearly ? 'year' : 'month',
      },
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update subscription', details: message }, { status: 500 });
  }
}
