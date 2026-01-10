import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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
      // User not found - return error
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // If Resend is not configured, fall back to Supabase's built-in email
    if (!process.env.RESEND_API_KEY) {
      console.log('RESEND_API_KEY not configured, using Supabase built-in email');
      
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/password-reset`,
      });

      if (error) {
        console.error('Supabase reset password error:', error.message);
        return NextResponse.json(
          { error: 'Failed to send reset email' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Use Resend for custom emails
    const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Send email via Resend
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Scribo <onboarding@resend.dev>';
    
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Reset your Scribo password',
      html: generatePasswordResetEmail(resetLink),
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      // Fall back to Supabase email if Resend fails
      console.log('Falling back to Supabase email...');
      await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ success: true }); // Don't reveal errors to user
  }
}

function generatePasswordResetEmail(resetLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <span style="font-size: 28px; font-weight: 700; color: #1a1a1a;">Scribo</span>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a; text-align: center;">
                Reset Your Password
              </h1>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #666666; text-align: center;">
                Click the button below to choose a new password.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #1a78c2; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500; border-radius: 6px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #888888; text-align: center;">
                This link expires in 24 hours. If you didn't request this, ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0; font-size: 12px; color: #999999;">© ${new Date().getFullYear()} Scribo</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
