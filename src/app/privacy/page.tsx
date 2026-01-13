import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo/Logo';
import styles from './privacy.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy | Scribo',
  description: 'Privacy Policy for Scribo - Learn how we collect, use, and protect your data.',
};

/**
 * Privacy Policy page
 * Displays our privacy policy and data handling practices
 */
export default function PrivacyPage() {
  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <Logo asLink size="small" />
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Introduction</h2>
          <p>
            Welcome to Scribo (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring you have a positive experience when using our writing application. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Information We Collect</h2>
          
          <h3 className={styles.subsectionTitle}>2.1 Account Information</h3>
          <p>When you create an account, we collect:</p>
          <ul>
            <li>Email address</li>
            <li>Password (stored securely using industry-standard hashing)</li>
            <li>Subscription status and payment information (processed securely through Stripe)</li>
          </ul>

          <h3 className={styles.subsectionTitle}>2.2 Content You Create</h3>
          <p>
            We store the content you create in Scribo, including:
          </p>
          <ul>
            <li>Projects, files, and folders you create</li>
            <li>Text content you write</li>
            <li>Project metadata (names, structure, organization)</li>
            <li>Version history of your documents</li>
          </ul>
          <p>
            <strong>Your content is private.</strong> We do not access, read, or analyze your content except as necessary to provide the service (e.g., saving, syncing, or when you explicitly request support).
          </p>

          <h3 className={styles.subsectionTitle}>2.3 Usage Information</h3>
          <p>We automatically collect certain information about how you use Scribo:</p>
          <ul>
            <li>Device information (browser type, operating system)</li>
            <li>Usage patterns (features used, time spent)</li>
            <li>Error logs and performance data</li>
            <li>IP address (for security and analytics)</li>
          </ul>

          <h3 className={styles.subsectionTitle}>2.4 Cookies and Tracking</h3>
          <p>
            We use cookies and similar technologies to:
          </p>
          <ul>
            <li>Maintain your session and authentication</li>
            <li>Remember your preferences</li>
            <li>Analyze usage patterns (via PostHog, if enabled)</li>
          </ul>
          <p>You can control cookies through your browser settings.</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our service</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send you important service updates and notifications</li>
            <li>Respond to your support requests</li>
            <li>Detect and prevent fraud or abuse</li>
            <li>Comply with legal obligations</li>
            <li>Analyze usage to improve our product (aggregated, anonymized data)</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Data Storage and Security</h2>
          <p>
            Your data is stored securely using Supabase (PostgreSQL database) with the following protections:
          </p>
          <ul>
            <li><strong>Encryption:</strong> Data is encrypted in transit (HTTPS) and at rest</li>
            <li><strong>Access Control:</strong> Row-level security ensures you can only access your own data</li>
            <li><strong>Backups:</strong> Regular automated backups protect against data loss</li>
            <li><strong>Authentication:</strong> Secure password hashing and session management</li>
          </ul>
          <p>
            While we implement industry-standard security measures, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security but are committed to protecting your data.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Third-Party Services</h2>
          <p>We use the following third-party services that may process your data:</p>
          <ul>
            <li><strong>Supabase:</strong> Database and authentication hosting</li>
            <li><strong>Stripe:</strong> Payment processing (we do not store your full payment card details)</li>
            <li><strong>Resend:</strong> Email delivery service</li>
            <li><strong>PostHog:</strong> Analytics (optional, anonymized usage data)</li>
          </ul>
          <p>
            These services have their own privacy policies. We only share data necessary for them to provide their services to us.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Your Rights and Choices</h2>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Delete:</strong> Delete your account and all associated data</li>
            <li><strong>Export:</strong> Export your content in various formats</li>
            <li><strong>Update:</strong> Modify your account information</li>
            <li><strong>Opt-out:</strong> Disable analytics tracking</li>
          </ul>
          <p>
            To exercise these rights, contact us at the email address provided below or use the account deletion feature in your settings.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as needed to provide our service. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or regulatory purposes.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Children&apos;s Privacy</h2>
          <p>
            Scribo is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. Your continued use of Scribo after changes become effective constitutes acceptance of the updated policy.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <p>
            <strong>Twitter:</strong>{' '}
            <a href="https://twitter.com/lucamakes" target="_blank" rel="noopener noreferrer" className={styles.link}>
              @lucamakes
            </a>
            {' '}or use the{' '}
            <Link href="/feedback" className={styles.link}>
              feedback feature
            </Link>
            {' '}in the app.
          </p>
        </div>

        <div className={styles.footer}>
          <Link href="/" className={styles.backLink}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

