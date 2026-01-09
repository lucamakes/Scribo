'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import styles from './UpgradePrompt.module.css';

interface UpgradePromptProps {
  type: 'banner' | 'modal';
  percentage?: number;
  onClose?: () => void;
}

/**
 * Upgrade prompt component - shows as banner at 80% or modal at 100%
 */
export function UpgradePrompt({ type, percentage = 100, onClose }: UpgradePromptProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async (priceId: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          priceId,
          returnUrl: window.location.origin,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to start checkout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (type === 'banner') {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.warningModal}>
          {onClose && (
            <button onClick={onClose} className={styles.closeButton} aria-label="Dismiss">
              <X size={18} strokeWidth={1.5} />
            </button>
          )}
          
          <h2 className={styles.warningTitle}>You&apos;ve used {percentage}% of your free words</h2>
          <p className={styles.warningSubtitle}>
            Upgrade to Pro for unlimited writing
          </p>

          <div className={styles.warningActions}>
            <button
              onClick={onClose}
              className={styles.warningDismiss}
            >
              Continue writing
            </button>
            <button
              onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!)}
              className={styles.warningUpgrade}
              disabled={isLoading}
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button onClick={onClose} className={styles.closeButton} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        )}
        
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Simple, honest pricing</h2>
          <p className={styles.modalSubtitle}>Start free. Upgrade when you need more words.</p>
        </div>

        <div className={styles.plans}>
          {/* Free Plan */}
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
            </ul>
            <button className={styles.planButton} disabled>
              Current plan
            </button>
          </div>

          {/* Pro Monthly */}
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
            <button
              onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!)}
              className={styles.planButton}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Upgrade'}
            </button>
          </div>

          {/* Pro Yearly - Recommended */}
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
            <button
              onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY!)}
              className={styles.planButtonPrimary}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Upgrade'}
            </button>
          </div>
        </div>

        <p className={styles.modalFooter}>
          Cancel anytime. Your writing is always yours.
        </p>
      </div>
    </div>
  );
}
