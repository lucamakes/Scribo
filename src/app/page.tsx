'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { Sparkles, FileText, Telescope, Download, ArrowRight, Check } from 'lucide-react';
import FeedbackSection from '@/components/FeedbackSection/FeedbackSection';
import FAQSection from '@/components/FAQSection/FAQSection';
import styles from './page.module.css';

/**
 * Landing page
 */
export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && user && mounted) {
      router.replace('/projects');
    }
  }, [user, loading, router, mounted]);

  // Show landing page for non-logged-in users
  if (loading || (user && mounted)) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.landing}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <FileText size={24} strokeWidth={1.5} />
            <span>Scribe</span>
          </div>
          <nav className={styles.nav}>
            <button onClick={() => router.push('/auth/login')} className={styles.navLink}>
              Log in
            </button>
            <button onClick={() => router.push('/auth/signup')} className={styles.navButton}>
              Get started
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Write your story,<br />without distractions
          </h1>
          <p className={styles.heroSubtitle}>
            A minimal writing app for authors. Organize chapters, track progress, and focus on what matters—your words.
          </p>
          <div className={styles.heroCta}>
            <button onClick={() => router.push('/auth/signup')} className={styles.primaryButton}>
              Start writing free
              <ArrowRight size={18} strokeWidth={1.5} />
            </button>
            <button onClick={() => router.push('/demo')} className={styles.secondaryButton}>
              Try it first
            </button>
            <p className={styles.heroNote}>15,000 words free. No credit card required.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.featuresContent}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <FileText size={24} strokeWidth={1.5} />
            </div>
            <h3 className={styles.featureTitle}>Organize your work</h3>
            <p className={styles.featureDescription}>
              Create folders and files to structure your novel, screenplay, or any long-form writing project.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <Telescope size={24} strokeWidth={1.5} />
            </div>
            <h3 className={styles.featureTitle}>Visualize progress</h3>
            <p className={styles.featureDescription}>
              See your entire project at a glance with the constellation view. Track word counts across chapters.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <Download size={24} strokeWidth={1.5} />
            </div>
            <h3 className={styles.featureTitle}>Export anywhere</h3>
            <p className={styles.featureDescription}>
              Export your work to Markdown, plain text, or Word format. Your writing, your way.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricing}>
        <div className={styles.pricingContent}>
          <h2 className={styles.pricingTitle}>Simple, honest pricing</h2>
          <p className={styles.pricingSubtitle}>Start free. Upgrade when you need more.</p>

          <div className={styles.billingToggle}>
            <button 
              className={`${styles.billingOption} ${billingPeriod === 'monthly' ? styles.billingOptionActive : ''}`}
              onClick={() => setBillingPeriod('monthly')}
            >
              Monthly
            </button>
            <button 
              className={`${styles.billingOption} ${billingPeriod === 'yearly' ? styles.billingOptionActive : ''}`}
              onClick={() => setBillingPeriod('yearly')}
            >
              Yearly
              <span className={styles.saveBadge}>Save 33%</span>
            </button>
          </div>

          <div className={styles.plans}>
            <div className={styles.plan}>
              <h3 className={styles.planName}>Free</h3>
              <div className={styles.planPrice}>
                <span className={styles.planAmount}>$0</span>
                <span className={styles.planPeriod}>/forever</span>
              </div>
              <ul className={styles.planFeatures}>
                <li><Check size={16} strokeWidth={2} /> 15,000 words</li>
                <li><Check size={16} strokeWidth={2} /> Unlimited projects</li>
                <li><Check size={16} strokeWidth={2} /> All core features</li>
                <li><Check size={16} strokeWidth={2} /> Export to Markdown</li>
              </ul>
              <button onClick={() => router.push('/auth/signup')} className={styles.planButton}>
                Get started
              </button>
            </div>

            <div className={`${styles.plan} ${styles.planPrimary}`}>
              <div className={styles.planBadge}>Most popular</div>
              <h3 className={styles.planName}>Pro</h3>
              <div className={styles.planPrice}>
                <span className={styles.planAmount}>{billingPeriod === 'monthly' ? '$5' : '$40'}</span>
                <span className={styles.planPeriod}>{billingPeriod === 'monthly' ? '/month' : '/year'}</span>
              </div>
              {billingPeriod === 'yearly' && (
                <p className={styles.planSavings}>$3.33/month — save $20/year</p>
              )}
              <ul className={styles.planFeatures}>
                <li><Check size={16} strokeWidth={2} /> Unlimited words</li>
                <li><Check size={16} strokeWidth={2} /> Unlimited projects</li>
                <li><Check size={16} strokeWidth={2} /> All core features</li>
                <li><Check size={16} strokeWidth={2} /> Priority support</li>
              </ul>
              <button onClick={() => router.push('/auth/signup')} className={styles.planButtonPrimary}>
                Start free trial
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback */}
      <FeedbackSection />

      {/* FAQ */}
      <FAQSection />

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p className={styles.footerText}>© 2025 Scribe. Built for writers.</p>
        </div>
      </footer>
    </div>
  );
}
