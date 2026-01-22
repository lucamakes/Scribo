'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { ArrowRight, Check, Clock, Users, Menu, X, LogOut } from 'lucide-react';
import FeedbackBoard from '@/components/FeedbackBoard/FeedbackBoard';
import FAQSection from '@/components/FAQSection/FAQSection';
import BentoFeatures from '@/components/BentoFeatures/BentoFeatures';
import Button from '@/components/Button/Button';
import { Logo } from '@/components/Logo/Logo';
import styles from './page.module.css';

interface Stats {
  users: number;
  words: number;
  usersFormatted: string;
  wordsFormatted: string;
}

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Fetch stats
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Failed to fetch stats:', err));
  }, []);

  // Show loading only while checking auth, don't redirect
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  const isSignedIn = !!user && mounted;

  return (
    <div className={styles.landing}>
      {/* Sticky Header */}
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
        <div className={styles.headerContent}>
          <Logo />

          {/* Desktop Nav */}
          <nav className={styles.nav}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#pricing" className={styles.navLink}>Pricing</a>
            <a href="#faq" className={styles.navLink}>FAQ</a>
            <a href="#feedback" className={styles.navLink}>Feedback</a>
            {isSignedIn ? (
              <>
                <button onClick={() => signOut()} className={styles.navLink}>
                  Sign out
                  <LogOut size={16} strokeWidth={1.5} />
                </button>
                <Button onClick={() => router.push('/projects')}>
                  Go to Projects
                  <ArrowRight size={16} strokeWidth={1.5} />
                </Button>
              </>
            ) : (
              <>
                <button onClick={() => router.push('/auth/login')} className={styles.navLink}>
                  Log in
                </button>
                <Button onClick={() => router.push('/demo')} variant="secondary">
                  Try Demo
                </Button>
                <Button onClick={() => router.push('/auth/signup')}>
                  Start Free
                  <ArrowRight size={16} strokeWidth={1.5} />
                </Button>
              </>
            )}
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
            <a href="#faq" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <a href="#feedback" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Feedback</a>
            <div className={styles.mobileNavDivider} />
            {isSignedIn ? (
              <div className={styles.mobileNavButtons}>
                <Button onClick={() => { signOut(); setMobileMenuOpen(false); }} variant="secondary">
                  Sign out
                  <LogOut size={16} strokeWidth={1.5} />
                </Button>
                <Button onClick={() => { router.push('/projects'); setMobileMenuOpen(false); }}>
                  Go to Projects
                  <ArrowRight size={16} strokeWidth={1.5} />
                </Button>
              </div>
            ) : (
              <div className={styles.mobileNavButtons}>
                <button onClick={() => { router.push('/auth/login'); setMobileMenuOpen(false); }} className={styles.mobileNavLink}>
                  Log in
                </button>
                <Button onClick={() => { router.push('/demo'); setMobileMenuOpen(false); }} variant="secondary">
                  Try Demo
                </Button>
                <Button onClick={() => { router.push('/auth/signup'); setMobileMenuOpen(false); }}>
                  Start Free
                  <ArrowRight size={16} strokeWidth={1.5} />
                </Button>
              </div>
            )}
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
            <span>
              Join <strong>{stats?.usersFormatted || '2,400+'}+</strong> writers who&apos;ve written{' '}
              <strong>{stats?.wordsFormatted || '12M'}+ words</strong> with Scribo
            </span>
          </div>

          {/* CTA with Risk Reversal */}
          <div className={styles.heroCta}>
            {isSignedIn ? (
              <Button onClick={() => router.push('/projects')} className={styles.heroButton}>
                Go to Projects
                <ArrowRight size={18} strokeWidth={1.5} />
              </Button>
            ) : (
              <>
                <Button onClick={() => router.push('/demo')} variant="secondary" className={styles.heroButton}>
                  Try Demo — No signup
                </Button>
                <Button onClick={() => router.push('/auth/signup')} className={styles.heroButton}>
                  Start Writing Free
                  <ArrowRight size={18} strokeWidth={1.5} />
                </Button>
              </>
            )}
          </div>
          {!isSignedIn && (
            <p className={styles.heroMicrocopy}>
              <Check size={14} strokeWidth={2} /> No credit card required
              <span className={styles.microDot}>•</span>
              <Clock size={14} strokeWidth={2} /> 30-second setup
              <span className={styles.microDot}>•</span>
              15,000 words free
            </p>
          )}
        </div>

        {/* Product Showcase */}
        <video
          src="/hero-video.mp4"
          className={styles.showcaseImage}
          onClick={() => router.push('/demo')}
          autoPlay
          loop
          muted
          playsInline
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
              </div>
              <ul className={styles.planFeatures}>
                <li><Check size={16} strokeWidth={2} /> 15,000 words</li>
                <li><Check size={16} strokeWidth={2} /> Unlimited projects</li>
                <li><Check size={16} strokeWidth={2} /> All core features</li>
              </ul>
              <Button onClick={() => router.push(isSignedIn ? '/projects' : '/auth/signup')} variant="secondary">
                {isSignedIn ? 'Go to Projects' : 'Get started'}
              </Button>
            </div>

            <div className={styles.plan}>
              <h3 className={styles.planName}>Pro Monthly</h3>
              <div className={styles.planPrice}>
                <span className={styles.planAmount}>$7</span>
                <span className={styles.planPeriod}>/month</span>
              </div>
              <ul className={styles.planFeatures}>
                <li><Check size={16} strokeWidth={2} /> Unlimited words</li>
                <li><Check size={16} strokeWidth={2} /> Unlimited projects</li>
                <li><Check size={16} strokeWidth={2} /> All core features</li>
                <li><Check size={16} strokeWidth={2} /> Priority support</li>
              </ul>
              <Button onClick={() => router.push(isSignedIn ? '/projects' : '/auth/signup?plan=monthly')} variant="secondary">
                {isSignedIn ? 'Go to Projects' : 'Get Pro Monthly'}
              </Button>
            </div>

            <div className={`${styles.plan} ${styles.planPrimary}`}>
              <div className={styles.planBadge}>Recommended</div>
              <h3 className={styles.planName}>Pro Yearly</h3>
              <div className={styles.planPrice}>
                <span className={styles.planAmount}>$55</span>
                <span className={styles.planPeriod}>/year</span>
              </div>
              <p className={styles.planSavings}>$4.58/month — save $29/year</p>
              <ul className={styles.planFeatures}>
                <li><Check size={16} strokeWidth={2} /> Unlimited words</li>
                <li><Check size={16} strokeWidth={2} /> Unlimited projects</li>
                <li><Check size={16} strokeWidth={2} /> All core features</li>
                <li><Check size={16} strokeWidth={2} /> Priority support</li>
              </ul>
              <Button onClick={() => router.push(isSignedIn ? '/projects' : '/auth/signup?plan=yearly')}>
                {isSignedIn ? 'Go to Projects' : 'Get Pro Yearly'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection />

      {/* Feedback Board */}
      <FeedbackBoard />

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaContent}>
          <h2 className={styles.finalCtaTitle}>Ready to finish your story?</h2>
          <p className={styles.finalCtaSubtitle}>Join thousands of writers who&apos;ve found their flow.</p>
          <div className={styles.finalCtaButtons}>
            <Button onClick={() => router.push(isSignedIn ? '/projects' : '/auth/signup')}>
              {isSignedIn ? 'Go to Projects' : 'Start Writing Free'}
              <ArrowRight size={18} strokeWidth={1.5} />
            </Button>
          </div>
          {!isSignedIn && (
            <p className={styles.heroMicrocopy}>
              <Check size={14} strokeWidth={2} /> No credit card required
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <Logo />
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
                {isSignedIn ? (
                  <a href="/projects">My Projects</a>
                ) : (
                  <>
                    <a href="/auth/login">Log in</a>
                    <a href="/auth/signup">Sign up</a>
                  </>
                )}
              </div>

              <div className={styles.footerColumn}>
                <h4>Legal</h4>
                <a href="/privacy">Privacy Policy</a>
                <a href="/terms">Terms of Service</a>
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
