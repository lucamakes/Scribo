'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { ArrowRight, Check, Clock, Users, Menu, X } from 'lucide-react';
import FeedbackBoard from '@/components/FeedbackBoard/FeedbackBoard';
import FAQSection from '@/components/FAQSection/FAQSection';
import BentoFeatures from '@/components/BentoFeatures/BentoFeatures';
import styles from './page.module.css';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <span className={styles.logoText}>Scribo</span>
          </div>

          {/* Desktop Nav */}
          <nav className={styles.nav}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#pricing" className={styles.navLink}>Pricing</a>
            <a href="#feedback" className={styles.navLink}>Feedback</a>
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

          {/* Mobile Menu Button */}
          <button
            className={styles.mobileMenuButton}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className={styles.mobileNav}>
            <a href="#features" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#pricing" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#feedback" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Feedback</a>
            <div className={styles.mobileNavDivider} />
            <button onClick={() => { router.push('/auth/login'); setMobileMenuOpen(false); }} className={styles.mobileNavLink}>
              Log in
            </button>
            <button onClick={() => { router.push('/demo'); setMobileMenuOpen(false); }} className={styles.mobileNavButton}>
              Try Demo
            </button>
            <button onClick={() => { router.push('/auth/signup'); setMobileMenuOpen(false); }} className={styles.mobileNavButtonPrimary}>
              Start Free
              <ArrowRight size={16} strokeWidth={2} />
            </button>
          </nav>
        )}
      </header>

      {/* 5-Second Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          {/* Category Badge */}
          <div className={styles.heroBadge}>
            Distraction-Free Writing App
          </div>

          {/* What + Who + After State */}
          <h1 className={styles.heroTitle}>
            No bloat. No learning curve.<br />
            <span className={styles.heroHighlight}>Just write.</span>
          </h1>

          <p className={styles.heroSubtitle}>
            For authors who are tired of scattered notes and endless distractions.
            <br />
            <strong>Organize, write, and track progress</strong> — all in one minimal space.
          </p>

          {/* Social Proof Stat */}
          <div className={styles.heroStat}>
            <Users size={18} strokeWidth={1.5} />
            <span>Join <strong>2,400+</strong> writers who&apos;ve written <strong>12M+ words</strong> with Scribo</span>
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

        {/* Product Showcase */}
        <img
          src="/app.png"
          alt="Scribo app interface"
          className={styles.showcaseImage}
          onClick={() => router.push('/demo')}
        />
      </section>

      {/* Features Grid */}
      {/* Features Grid */}
      <BentoFeatures />

      {/* Pricing */}
      <section id="pricing" className={styles.pricing}>
        <div className={styles.pricingContent}>
          <h2 className={styles.sectionTitle}>Simple, honest pricing</h2>
          <p className={styles.sectionSubtitle}>Start free. Upgrade when you need more words.</p>

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

            <div className={styles.plan}>
              <h3 className={styles.planName}>Pro Monthly</h3>
              <div className={styles.planPrice}>
                <span className={styles.planAmount}>$5</span>
                <span className={styles.planPeriod}>/month</span>
              </div>
              <ul className={styles.planFeatures}>
                <li><Check size={16} strokeWidth={2} /> Unlimited words</li>
                <li><Check size={16} strokeWidth={2} /> Unlimited projects</li>
                <li><Check size={16} strokeWidth={2} /> All core features</li>
                <li><Check size={16} strokeWidth={2} /> Priority support</li>
              </ul>
              <button onClick={() => router.push('/auth/signup')} className={styles.planButton}>
                Start free trial
              </button>
            </div>

            <div className={`${styles.plan} ${styles.planPrimary}`}>
              <div className={styles.planBadge}>Recommended</div>
              <h3 className={styles.planName}>Pro Yearly</h3>
              <div className={styles.planPrice}>
                <span className={styles.planAmount}>$40</span>
                <span className={styles.planPeriod}>/year</span>
              </div>
              <p className={styles.planSavings}>$3.33/month — save $20/year</p>
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

      {/* Feedback Board */}
      <FeedbackBoard />

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
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <div className={styles.footerLogo}>
                <span className={styles.logoText}>Scribo</span>
              </div>
              <p className={styles.footerTagline}>
                Distraction-free writing for authors who want to finish their book.
              </p>
            </div>

            <div className={styles.footerLinks}>
              <div className={styles.footerColumn}>
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="/demo">Try Demo</a>
                <a href="#feedback">Feedback</a>
              </div>

              <div className={styles.footerColumn}>
                <h4>Company</h4>
                <a href="/auth/login">Log in</a>
                <a href="/auth/signup">Sign up</a>
              </div>

              <div className={styles.footerColumn}>
                <h4>Legal</h4>
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p className={styles.footerText}>© 2025 Scribo. Built for writers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
