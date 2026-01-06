'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { FileText, ArrowRight, Check, FolderTree, Eye, Download, Clock, Users, Play, Menu, X } from 'lucide-react';
import FeedbackBoard from '@/components/FeedbackBoard/FeedbackBoard';
import FAQSection from '@/components/FAQSection/FAQSection';
import styles from './page.module.css';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
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
            <FileText size={24} strokeWidth={1.5} />
            <span>Scripta</span>
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
            <span>Join <strong>2,400+</strong> writers who&apos;ve written <strong>12M+ words</strong> with Scripta</span>
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
          <div className={styles.showcaseImage} onClick={() => setShowVideo(true)}>
            {showVideo ? (
              <iframe
                src="https://www.youtube.com/embed/6xJWQRVl9nw?autoplay=1"
                title="Scripta Demo Video"
                className={styles.videoIframe}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <img
                  src="/app.png"
                  alt="Scripta app interface"
                  className={styles.appScreenshot}
                />
                <div className={styles.playButtonMobile}>
                  <Play size={24} strokeWidth={2} fill="white" />
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className={styles.features}>
        <div className={styles.featuresHeader}>
          <h2 className={styles.sectionTitle}>Everything you need to finish your manuscript</h2>
          <p className={styles.sectionSubtitle}>No bloat. No learning curve. Just write.</p>
        </div>
        <div className={styles.featuresContent}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <FolderTree size={24} strokeWidth={1.5} />
            </div>
            <h3 className={styles.featureTitle}>Nested folders & files</h3>
            <p className={styles.featureDescription}>
              Organize chapters, scenes, and notes exactly how you want. Unlimited depth.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <Eye size={24} strokeWidth={1.5} />
            </div>
            <h3 className={styles.featureTitle}>Visual progress tracking</h3>
            <p className={styles.featureDescription}>
              Watch your constellation grow as you write. Each star represents a chapter.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <Download size={24} strokeWidth={1.5} />
            </div>
            <h3 className={styles.featureTitle}>Export anywhere</h3>
            <p className={styles.featureDescription}>
              One click to Markdown, Word, or plain text. Your words, your format.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <FileText size={24} strokeWidth={1.5} />
            </div>
            <h3 className={styles.featureTitle}>Rich text formatting</h3>
            <p className={styles.featureDescription}>
              Bold, italic, headings, lists. All the formatting you need, nothing you don&apos;t.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <Clock size={24} strokeWidth={1.5} />
            </div>
            <h3 className={styles.featureTitle}>Auto-save everything</h3>
            <p className={styles.featureDescription}>
              Never lose a word. Every keystroke is saved automatically to the cloud.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <Users size={24} strokeWidth={1.5} />
            </div>
            <h3 className={styles.featureTitle}>Multiple projects</h3>
            <p className={styles.featureDescription}>
              Work on your novel, short stories, and blog posts. All in one place.
            </p>
          </div>
        </div>
      </section>

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
                <FileText size={24} strokeWidth={1.5} />
                <span>Scripta</span>
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
            <p className={styles.footerText}>© 2025 Scripta. Built for writers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
