import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { polar } from '@/lib/polar';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rateLimitResponse = await checkRateLimit(`portal:${ip}`, 'strict');
    if (rateLimitResponse) return rateLimitResponse;

    const { userId, returnUrl } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('polar_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.polar_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
    }

    // Create customer portal session
    const session = await polar.customerSessions.create({
      customerId: user.polar_customer_id,
    });

    return NextResponse.json({ url: session.customerPortalUrl });
  } catch (error) {
    console.error('Polar portal error:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
