import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo/Logo';
import styles from './terms.module.css';

export const metadata: Metadata = {
  title: 'Terms of Service | Scribo',
  description: 'Terms of Service for Scribo - Read our terms and conditions for using our writing application.',
};

/**
 * Terms of Service page
 * Displays our terms and conditions for using Scribo
 */
export default function TermsPage() {
  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <Logo asLink size="small" />
          <h1 className={styles.title}>Terms of Service</h1>
          <p className={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Agreement to Terms</h2>
          <p>
            By accessing or using Scribo (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these terms, you may not access the Service.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Description of Service</h2>
          <p>
            Scribo is a writing application that helps authors organize, write, and track progress on their creative projects. We provide:
          </p>
          <ul>
            <li>Project organization tools (files, folders, structure)</li>
            <li>Rich text editing capabilities</li>
            <li>Progress tracking and goal setting</li>
            <li>Export functionality</li>
            <li>Version history</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Account Registration</h2>
          <p>To use Scribo, you must:</p>
          <ul>
            <li>Be at least 13 years old</li>
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Free and Paid Plans</h2>
          
          <h3 className={styles.subsectionTitle}>4.1 Free Plan</h3>
          <p>
            The free plan includes:
          </p>
          <ul>
            <li>15,000 words total</li>
            <li>Unlimited projects</li>
            <li>All core features</li>
          </ul>

          <h3 className={styles.subsectionTitle}>4.2 Pro Plans</h3>
          <p>
            Pro plans (monthly or yearly) include:
          </p>
          <ul>
            <li>Unlimited words</li>
            <li>Unlimited projects</li>
            <li>All core features</li>
            <li>Priority support</li>
          </ul>

          <h3 className={styles.subsectionTitle}>4.3 Payment Terms</h3>
          <p>
            Payments are processed securely through Stripe. By subscribing to a paid plan, you agree to:
          </p>
          <ul>
            <li>Pay the subscription fee in advance</li>
            <li>Automatic renewal unless cancelled</li>
            <li>No refunds for partial billing periods (except as required by law)</li>
            <li>Price changes with 30 days notice</li>
          </ul>

          <h3 className={styles.subsectionTitle}>4.4 Cancellation</h3>
          <p>
            You may cancel your subscription at any time through your account settings or by contacting us. Cancellation takes effect at the end of your current billing period. You will retain access to Pro features until the period ends.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>5. User Content and Intellectual Property</h2>
          
          <h3 className={styles.subsectionTitle}>5.1 Your Content</h3>
          <p>
            You retain all ownership rights to the content you create in Scribo. We do not claim ownership of your content.
          </p>

          <h3 className={styles.subsectionTitle}>5.2 License to Us</h3>
          <p>
            By using Scribo, you grant us a limited, non-exclusive license to:
          </p>
          <ul>
            <li>Store and process your content to provide the Service</li>
            <li>Create backups of your content</li>
            <li>Access your content when necessary for support or troubleshooting</li>
          </ul>
          <p>
            This license terminates when you delete your content or account.
          </p>

          <h3 className={styles.subsectionTitle}>5.3 Prohibited Content</h3>
          <p>
            You agree not to use Scribo to create, store, or share content that:
          </p>
          <ul>
            <li>Violates any laws or regulations</li>
            <li>Infringes on intellectual property rights</li>
            <li>Contains malware, viruses, or harmful code</li>
            <li>Is defamatory, harassing, or abusive</li>
            <li>Violates privacy rights of others</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Attempt to gain unauthorized access to the Service or other users&apos; accounts</li>
            <li>Use automated systems (bots, scrapers) to access the Service</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            <li>Use the Service for any illegal purpose</li>
            <li>Share your account credentials with others</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Service Availability</h2>
          <p>
            We strive to provide reliable service but do not guarantee:
          </p>
          <ul>
            <li>Uninterrupted or error-free operation</li>
            <li>That the Service will meet all your requirements</li>
            <li>That defects will be corrected</li>
          </ul>
          <p>
            We reserve the right to modify, suspend, or discontinue the Service at any time with or without notice.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Data Backup and Loss</h2>
          <p>
            While we implement regular backups, you are responsible for:
          </p>
          <ul>
            <li>Exporting your content regularly if desired</li>
            <li>Maintaining your own backups of critical content</li>
          </ul>
          <p>
            We are not liable for any loss of data, content, or information stored in Scribo.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Termination</h2>
          <p>
            We may suspend or terminate your account if you:
          </p>
          <ul>
            <li>Violate these Terms</li>
            <li>Engage in fraudulent or illegal activity</li>
            <li>Fail to pay subscription fees</li>
            <li>Abuse the Service or other users</li>
          </ul>
          <p>
            You may terminate your account at any time by deleting it in your account settings. Upon termination, your access to the Service will cease, and we may delete your data after a reasonable retention period.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, SCRIBO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
          </p>
          <p>
            Our total liability for any claims shall not exceed the amount you paid us in the 12 months preceding the claim.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Scribo, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of:
          </p>
          <ul>
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any rights of another</li>
            <li>Your content</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>12. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify you of material changes by:
          </p>
          <ul>
            <li>Posting the updated Terms on this page</li>
            <li>Updating the &quot;Last updated&quot; date</li>
            <li>Sending an email notification for significant changes</li>
          </ul>
          <p>
            Your continued use of Scribo after changes become effective constitutes acceptance of the updated Terms.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Scribo operates, without regard to its conflict of law provisions.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>14. Dispute Resolution</h2>
          <p>
            Any disputes arising out of or relating to these Terms or the Service shall be resolved through good faith negotiation. If negotiation fails, disputes may be resolved through binding arbitration or in a court of competent jurisdiction.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>15. Contact Information</h2>
          <p>
            If you have questions about these Terms, please contact us:
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

