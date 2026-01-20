import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { polar } from '@/lib/polar';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('polar_subscription_id, polar_customer_id, subscription_status, subscription_end_date')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({
        subscription: null,
        status: 'free',
        currentPlan: null,
      });
    }

    // If we have a subscription ID, fetch details from Polar
    if (user.polar_subscription_id) {
      try {
        const subscription = await polar.subscriptions.get({
          id: user.polar_subscription_id,
        });

        const isYearly = subscription.recurringInterval === 'year';

        return NextResponse.json({
          subscription: {
            id: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            currentPeriodEnd: subscription.currentPeriodEnd,
            interval: subscription.recurringInterval,
          },
          status: user.subscription_status,
          currentPlan: isYearly ? 'yearly' : 'monthly',
        });
      } catch (polarError) {
        console.error('Failed to retrieve subscription:', polarError);
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
