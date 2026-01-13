import { Resend } from 'resend';
import { randomUUID } from 'crypto';

/**
 * Email service for sending emails via Resend.
 * Abstracts Resend logic from route handlers and components.
 */

type EmailResult =
  | { status: 'success'; data: { id: string } }
  | { status: 'error'; error: string };

/**
 * Gets the default sender email address from environment variables.
 * Falls back to Resend's default if not configured.
 */
function getDefaultFromEmail(): string {
  return (
    process.env.RESEND_FROM_EMAIL || 'Scribo <onboarding@resend.dev>'
  );
}

/**
 * Initializes and returns a Resend client instance.
 * Returns null if RESEND_API_KEY is not configured.
 */
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Sends an email via Resend with improved deliverability.
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - HTML content of the email
 * @param text - Plain text version of the email (optional but recommended)
 * @param from - Sender email address (optional, uses default if not provided)
 * @param replyTo - Reply-to email address (optional)
 * @returns Result object indicating success or failure
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
  from?: string,
  replyTo?: string
): Promise<EmailResult> {
  const resend = getResendClient();
  
  if (!resend) {
    return {
      status: 'error',
      error: 'Resend API key not configured',
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: from || getDefaultFromEmail(),
      to,
      subject,
      html,
      text: text || stripHtml(html),
      replyTo,
      headers: {
        'X-Entity-Ref-ID': randomUUID(),
      },
    });

    if (error) {
      return {
        status: 'error',
        error: error.message || 'Failed to send email',
      };
    }

    return {
      status: 'success',
      data: { id: data?.id || 'unknown' },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      status: 'error',
      error: errorMessage,
    };
  }
}

/**
 * Strips HTML tags from a string to create a plain text version.
 * Used as fallback when no plain text version is provided.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates HTML template for password reset emails with improved deliverability.
 * @param resetLink - The password reset link URL
 * @returns HTML string for the email
 */
export function generatePasswordResetEmailTemplate(
  resetLink: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Scribo Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; margin: 0 auto;">
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <span style="font-size: 28px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px;">Scribo</span>
            </td>
          </tr>
          <tr>
            <td style="background: #ffffff; border-radius: 12px; padding: 48px 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1a1a1a; text-align: left; line-height: 1.3;">
                Reset Your Password
              </h1>
              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #4b5563; text-align: left;">
                We received a request to reset your password. Click the button below to create a new password for your account.
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="left" style="padding: 0 0 32px;">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #1a78c2; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500; border-radius: 6px; text-align: center; min-width: 160px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #6b7280; text-align: left;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 32px; font-size: 13px; line-height: 1.6; color: #9ca3af; text-align: left; word-break: break-all; font-family: 'Courier New', monospace;">
                ${resetLink}
              </p>
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #6b7280; text-align: left; border-top: 1px solid #e5e7eb; padding-top: 24px;">
                This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                © ${new Date().getFullYear()} Scribo. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Generates plain text version of password reset email.
 * @param resetLink - The password reset link URL
 * @returns Plain text string for the email
 */
export function generatePasswordResetEmailText(resetLink: string): string {
  return `Reset Your Scribo Password

We received a request to reset your password. Click the link below to create a new password for your account.

${resetLink}

This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

© ${new Date().getFullYear()} Scribo. All rights reserved.`.trim();
}

