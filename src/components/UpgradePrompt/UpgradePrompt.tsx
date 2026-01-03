'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
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
            <button onClick={onClose} className={styles.warningClose} aria-label="Dismiss">
              <X size={18} strokeWidth={1.5} />
            </button>
          )}
          
          <div className={styles.warningIcon}>
            <Sparkles size={24} strokeWidth={1.5} />
          </div>
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
          <button onClick={onClose} className={styles.modalClose} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        )}
        <div className={styles.modalHeader}>
          <div className={styles.modalIcon}>
            <Sparkles size={24} strokeWidth={1.5} />
          </div>
          <h2 className={styles.modalTitle}>You&apos;ve reached your limit</h2>
          <p className={styles.modalSubtitle}>
            Upgrade to Pro for unlimited writing
          </p>
        </div>

        <div className={styles.plans}>
          <button
            onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!)}
            className={styles.planButton}
            disabled={isLoading}
          >
            <span className={styles.planName}>Monthly</span>
            <span className={styles.planPrice}>$5/mo</span>
          </button>
          
          <button
            onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY!)}
            className={`${styles.planButton} ${styles.planButtonPrimary}`}
            disabled={isLoading}
          >
            <span className={styles.planName}>Yearly</span>
            <span className={styles.planPrice}>$40/yr</span>
            <span className={styles.planSave}>Save 33%</span>
          </button>
        </div>

        <p className={styles.modalFooter}>
          Cancel anytime. Your writing is always yours.
        </p>
      </div>
    </div>
  );
}
