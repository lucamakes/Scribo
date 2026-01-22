import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendEmail,
  generatePasswordResetEmailTemplate,
  generatePasswordResetEmailText,
} from '@/lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// In-memory rate limit store (per email)
const rateLimitStore = new Map<string, { count: number; lastRequest: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 3; // Max 3 requests per hour per email

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.lastRequest > RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

function checkRateLimit(email: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = rateLimitStore.get(key);

  if (!record) {
    rateLimitStore.set(key, { count: 1, lastRequest: now });
    return { allowed: true };
  }

  // Reset if window has passed
  if (now - record.lastRequest > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(key, { count: 1, lastRequest: now });
    return { allowed: true };
  }

  // Check if limit exceeded
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW - (now - record.lastRequest)) / 1000 / 60);
    return { allowed: false, retryAfter };
  }

  // Increment count
  record.count++;
  record.lastRequest = now;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimit = checkRateLimit(email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${rateLimit.retryAfter} minutes.` },
        { status: 429 }
      );
    }

    // Check if user exists in database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      // Don't reveal if user doesn't exist - return success anyway
      return NextResponse.json({ success: true });
    }

    // Generate password reset link using Supabase Admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(),
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/password-reset`,
      },
    });

    if (linkError) {
      console.error('Failed to generate reset link:', linkError.message);
      // Don't reveal if user doesn't exist
      return NextResponse.json({ success: true });
    }

    const resetLink = linkData?.properties?.action_link;

    if (!resetLink) {
      console.error('No action link in response');
      return NextResponse.json({ success: true });
    }

    // Send email via Resend service with both HTML and plain text versions
    const emailResult = await sendEmail(
      email,
      'Reset your Scribo password',
      generatePasswordResetEmailTemplate(resetLink),
      generatePasswordResetEmailText(resetLink)
    );

    // If Resend fails or is not configured, fall back to Supabase's built-in email
    if (emailResult.status === 'error') {
      console.error('Resend error:', emailResult.error);
      console.log('Falling back to Supabase email...');
      
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase(),
        {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/password-reset`,
        }
      );

      if (supabaseError) {
        console.error('Supabase reset password error:', supabaseError.message);
        return NextResponse.json(
          { error: 'Failed to send reset email' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ success: true }); // Don't reveal errors to user
  }
}
