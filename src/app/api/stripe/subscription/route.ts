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
  // Access current_period_end - cast through unknown first
  const sub = subscription as unknown as { current_period_end: number };
  return sub.current_period_end || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
}

/**
 * GET - Get current subscription details
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_subscription_id, stripe_customer_id, subscription_status, subscription_end_date')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({
        subscription: null,
        status: 'free',
        currentPlan: null,
      });
    }

    // If we have a subscription ID, use it directly
    if (user.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
        const priceId = subscription.items.data[0]?.price.id;
        const isYearly = priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY;
        const periodEnd = getPeriodEnd(subscription);

        return NextResponse.json({
          subscription: {
            id: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
            priceId,
            interval: isYearly ? 'year' : 'month',
          },
          status: user.subscription_status,
          currentPlan: isYearly ? 'yearly' : 'monthly',
        });
      } catch (stripeError) {
        console.error('Failed to retrieve subscription by ID:', stripeError);
        // Fall through to try customer lookup
      }
    }

    // If no subscription ID but we have a customer ID, look up their subscriptions
    if (user.stripe_customer_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripe_customer_id,
          status: 'active',
          limit: 1,
        });

        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0];
          const priceId = subscription.items.data[0]?.price.id;
          const isYearly = priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY;
          const periodEnd = getPeriodEnd(subscription);

          // Update the database with the found subscription ID
          await supabase
            .from('users')
            .update({
              stripe_subscription_id: subscription.id,
              subscription_status: 'pro',
              subscription_end_date: new Date(periodEnd * 1000).toISOString(),
            })
            .eq('id', userId);

          return NextResponse.json({
            subscription: {
              id: subscription.id,
              status: subscription.status,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
              priceId,
              interval: isYearly ? 'year' : 'month',
            },
            status: 'pro',
            currentPlan: isYearly ? 'yearly' : 'monthly',
          });
        }

        // Also check for canceled subscriptions that still have access
        const canceledSubs = await stripe.subscriptions.list({
          customer: user.stripe_customer_id,
          status: 'canceled',
          limit: 1,
        });

        // Check trialing as well
        const trialingSubs = await stripe.subscriptions.list({
          customer: user.stripe_customer_id,
          status: 'trialing',
          limit: 1,
        });

        const allSubs = [...canceledSubs.data, ...trialingSubs.data];
        if (allSubs.length > 0) {
          const subscription = allSubs[0];
          const priceId = subscription.items.data[0]?.price.id;
          const isYearly = priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY;
          const periodEnd = getPeriodEnd(subscription);

          // Update the database
          await supabase
            .from('users')
            .update({
              stripe_subscription_id: subscription.id,
            })
            .eq('id', userId);

          return NextResponse.json({
            subscription: {
              id: subscription.id,
              status: subscription.status,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
              priceId,
              interval: isYearly ? 'year' : 'month',
            },
            status: user.subscription_status,
            currentPlan: isYearly ? 'yearly' : 'monthly',
          });
        }
      } catch (stripeError) {
        console.error('Failed to list subscriptions by customer:', stripeError);
      }
    }

    // No subscription found
    return NextResponse.json({
      subscription: null,
      status: user.subscription_status || 'free',
      currentPlan: null,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json({ error: 'Failed to get subscription' }, { status: 500 });
  }
}


/**
 * DELETE - Cancel subscription (at period end)
 */
export async function DELETE(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rateLimitResponse = await checkRateLimit(`cancel:${ip}`, 'strict');
    if (rateLimitResponse) return rateLimitResponse;

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
    }

    // Cancel at period end (user keeps access until then)
    const subscription = await stripe.subscriptions.update(user.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    const periodEnd = getPeriodEnd(subscription);

    // Update database
    await supabase
      .from('users')
      .update({
        subscription_status: 'cancelled',
        subscription_end_date: new Date(periodEnd * 1000).toISOString(),
      })
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      cancelAt: new Date(periodEnd * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}

/**
 * PATCH - Reactivate cancelled subscription
 */
export async function PATCH(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rateLimitResponse = await checkRateLimit(`reactivate:${ip}`, 'strict');
    if (rateLimitResponse) return rateLimitResponse;

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.stripe_subscription_id) {
      return NextResponse.json({ error: 'No subscription to reactivate' }, { status: 400 });
    }

    // Reactivate by removing cancel_at_period_end
    const subscription = await stripe.subscriptions.update(user.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
    const periodEnd = getPeriodEnd(subscription);

    // Update database
    await supabase
      .from('users')
      .update({
        subscription_status: 'pro',
        subscription_end_date: new Date(periodEnd * 1000).toISOString(),
      })
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    return NextResponse.json({ error: 'Failed to reactivate subscription' }, { status: 500 });
  }
}
