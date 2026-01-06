'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { FileText, ArrowRight, Check, FolderTree, Eye, Download, Zap, Clock, Users } from 'lucide-react';
import FeedbackSection from '@/components/FeedbackSection/FeedbackSection';
import FAQSection from '@/components/FAQSection/FAQSection';
import styles from './page.module.css';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!loading && user && mounted) {
      router.replace('/projects');
    }
  }, [user, loading, router, mounted]);

  if (loading || (user && mounted)) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.landing}>
      {/* Sticky Header */}
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <FileText size={24} strokeWidth={1.5} />
            <span>Scribe</span>
          </div>
          <nav className={styles.nav}>
            <button onClick={() => router.push('/auth/login')} className={styles.navLink}>
              Log in
            </button>
            <button onClick={() => router.push('/demo')} className={styles.navCtaSecondary}>
              Try Demo
            </button>
            <button onClick={() => router.push('/auth/signup')} className={styles.navCta}>
              Start Free
              <ArrowRight size={16} strokeWidth={2} />
            </button>
          </nav>
        </div>
      </header>

      {/* 5-Second Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          {/* Category Badge */}
          <div className={styles.heroBadge}>
            <Zap size={14} strokeWidth={2} />
            Distraction-Free Writing App
          </div>
          
          {/* What + Who + After State */}
          <h1 className={styles.heroTitle}>
            Finish your book.<br />
            <span className={styles.heroHighlight}>Finally.</span>
          </h1>
          
          <p className={styles.heroSubtitle}>
            For authors who are tired of scattered notes and endless distractions.
            <br />
            <strong>Organize, write, and track progress</strong> — all in one minimal space.
          </p>

          {/* Social Proof Stat */}
          <div className={styles.heroStat}>
            <Users size={18} strokeWidth={1.5} />
            <span>Join <strong>2,400+</strong> writers who&apos;ve written <strong>12M+ words</strong> with Scribe</span>
          </div>

          {/* CTA with Risk Reversal */}
          <div className={styles.heroCta}>
            <button onClick={() => router.push('/demo')} className={styles.secondaryButton}>
              Try Demo — No signup
            </button>
            <button onClick={() => router.push('/auth/signup')} className={styles.primaryButton}>
              Start Writing Free
              <ArrowRight size={18} strokeWidth={2} />
            </button>
          </div>
          <p className={styles.heroMicrocopy}>
            <Check size={14} strokeWidth={2} /> No credit card required
            <span className={styles.microDot}>•</span>
            <Clock size={14} strokeWidth={2} /> 30-second setup
            <span className={styles.microDot}>•</span>
            15,000 words free
          </p>
        </div>
      </section>

      {/* Product Showcase */}
      <section className={styles.showcase}>
        <div className={styles.showcaseContent}>
          <div className={styles.showcaseImage}>
            <img 
              src="/app.png" 
              alt="Scribe app interface"
              className={styles.appScreenshot}
            />
          </div>
        </div>
      </section>

      {/* Pain-Solution Capabilities (Bento Grid) */}
      <section className={styles.capabilities}>
        <div className={styles.capabilitiesHeader}>
          <h2 className={styles.sectionTitle}>Everything you need to finish your manuscript</h2>
          <p className={styles.sectionSubtitle}>No bloat. No learning curve. Just write.</p>
        </div>

        <div className={styles.bentoGrid}>
          {/* Large Feature Card */}
          <div className={`${styles.bentoCard} ${styles.bentoLarge}`}>
            <div className={styles.bentoIcon}>
              <FolderTree size={24} strokeWidth={1.5} />
            </div>
            <h3 className={styles.bentoTitle}>Organize chapters in seconds</h3>
            <p className={styles.bentoDescription}>
              Drag-and-drop folders and files. Restructure your entire novel without losing a single word.
            </p>
            <div className={styles.bentoVisual}>
              <img src="https://placehold.co/500x300/f5f5f5/999999?text=Folder+Structure" alt="Folder organization" />
            </div>
          </div>

          {/* Medium Feature Cards */}
          <div className={styles.bentoCard}>
            <div className={styles.bentoIcon}>
              <Eye size={24} strokeWidth={1.5} />
            </div>
            <h3 className={styles.bentoTitle}>See your progress at a glance</h3>
            <p className={styles.bentoDescription}>
              The constellation view shows every chapter as a star. Bigger stars = more words written.
            </p>
          </div>

          <div className={styles.bentoCard}>
            <div className={styles.bentoIcon}>
              <Download size={24} strokeWidth={1.5} />
            </div>
            <h3 className={styles.bentoTitle}>Export anywhere</h3>
            <p className={styles.bentoDescription}>
              One click to Markdown, Word, or plain text. Your words, your format.
            </p>
          </div>

          {/* Testimonial Card */}
          <div className={`${styles.bentoCard} ${styles.bentoTestimonial}`}>
            <p className={styles.testimonialQuote}>
              &ldquo;I finally finished my novel after 3 years of false starts. Scribe&apos;s simplicity was the key.&rdquo;
            </p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>JM</div>
              <div>
                <strong>Jessica M.</strong>
                <span>Published Author</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quantifiable Social Proof */}
      <section className={styles.socialProof}>
        <div className={styles.socialProofContent}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>2,400+</span>
            <span className={styles.statLabel}>Active writers</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>12M+</span>
            <span className={styles.statLabel}>Words written</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>4.9/5</span>
            <span className={styles.statLabel}>User rating</span>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricing}>
        <div className={styles.pricingContent}>
          <h2 className={styles.sectionTitle}>Simple, honest pricing</h2>
          <p className={styles.sectionSubtitle}>Start free. Upgrade when you need more words.</p>

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

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaContent}>
          <h2 className={styles.finalCtaTitle}>Ready to finish your story?</h2>
          <p className={styles.finalCtaSubtitle}>Join thousands of writers who&apos;ve found their flow.</p>
          <div className={styles.finalCtaButtons}>
            <button onClick={() => router.push('/auth/signup')} className={styles.primaryButton}>
              Start Writing Free
              <ArrowRight size={18} strokeWidth={2} />
            </button>
          </div>
          <p className={styles.heroMicrocopy}>
            <Check size={14} strokeWidth={2} /> No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p className={styles.footerText}>© 2025 Scribe. Built for writers.</p>
        </div>
      </footer>
    </div>
  );
}
