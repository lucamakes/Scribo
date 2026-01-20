import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { polar } from '@/lib/polar';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rateLimitResponse = await checkRateLimit(ip, 'strict');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { userId, productId, returnUrl } = await request.json();

    if (!userId || !productId) {
      return NextResponse.json(
        { error: 'Missing userId or productId' },
        { status: 400 }
      );
    }

    // Get user from database
    let { data: user } = await supabase
      .from('users')
      .select('id, email, polar_customer_id')
      .eq('id', userId)
      .single();

    // If user not in users table yet, get from auth and create record
    if (!user) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      
      if (authError || !authUser?.user) {
        return NextResponse.json(
          { error: 'User not found', details: authError?.message },
          { status: 404 }
        );
      }

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: authUser.user.email,
        })
        .select('id, email, polar_customer_id')
        .single();

      if (createError) {
        const { data: retryUser } = await supabase
          .from('users')
          .select('id, email, polar_customer_id')
          .eq('id', userId)
          .single();
        
        if (!retryUser) {
          return NextResponse.json(
            { error: 'Failed to create user record', details: createError.message },
            { status: 500 }
          );
        }
        user = retryUser;
      } else {
        user = newUser;
      }
    }

    // Create Polar checkout session
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${returnUrl || process.env.NEXT_PUBLIC_APP_URL}/projects?success=true&checkout_id={CHECKOUT_ID}`,
      customerEmail: user.email,
      metadata: {
        supabase_user_id: userId,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error('Polar checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: errorMessage },
      { status: 500 }
    );
  }
}
