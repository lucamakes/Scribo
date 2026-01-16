import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per minute (strict)
  const ip = getClientIP(request);
  const rateLimitResponse = await checkRateLimit(ip, 'strict');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { userId, priceId, returnUrl } = await request.json();

    if (!userId || !priceId) {
      return NextResponse.json(
        { error: 'Missing userId or priceId' },
        { status: 400 }
      );
    }

    // Try to get user from database first
    let { data: user } = await supabase
      .from('users')
      .select('id, email, stripe_customer_id')
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

      // Create user record in users table
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: authUser.user.email,
        })
        .select('id, email, stripe_customer_id')
        .single();

      if (createError) {
        // User might have been created by a trigger, try fetching again
        const { data: retryUser } = await supabase
          .from('users')
          .select('id, email, stripe_customer_id')
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

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to database
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${returnUrl || process.env.NEXT_PUBLIC_APP_URL}/projects?success=true`,
      cancel_url: `${returnUrl || process.env.NEXT_PUBLIC_APP_URL}/projects?cancelled=true`,
      metadata: {
        supabase_user_id: userId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: errorMessage },
      { status: 500 }
    );
  }
}
