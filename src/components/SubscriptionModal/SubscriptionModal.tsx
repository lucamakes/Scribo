'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink, Check, Sparkles, CreditCard } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useSubscription } from '@/lib/hooks/useSubscription';
import IconButton from '@/components/IconButton/IconButton';
import Button from '@/components/Button/Button';
import styles from './SubscriptionModal.module.css';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SubscriptionDetails {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
  priceId: string;
  interval: 'month' | 'year';
}

type BillingInterval = 'monthly' | 'yearly';

const PRO_FEATURES = [
  'Unlimited words',
  'Unlimited projects',
  'Version history',
  'Priority support',
];

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const { user } = useAuth();
  const { status, isPro, isLoading: isSubLoading } = useSubscription();
  
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [currentPlan, setCurrentPlan] = useState<BillingInterval | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('yearly');
  const [isFetching, setIsFetching] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  
  // Combined loading state - wait for both subscription hook and API fetch
  const isLoading = isSubLoading || isFetching;

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    
    setIsFetching(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/polar/subscription?userId=${user.id}`);
      const data = await response.json();
      
      if (data.subscription) {
        setSubscription(data.subscription);
        setCurrentPlan(data.currentPlan);
        setBillingInterval(data.currentPlan || 'yearly');
      } else {
        setSubscription(null);
        setCurrentPlan(null);
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setError('Failed to load subscription details');
    } finally {
      setIsFetching(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchSubscription();
    }
  }, [isOpen, user, fetchSubscription]);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (!user) return;
    
    const productId = billingInterval === 'yearly' 
      ? process.env.NEXT_PUBLIC_POLAR_PRODUCT_YEARLY!
      : process.env.NEXT_PUBLIC_POLAR_PRODUCT_MONTHLY!;
    
    setIsUpdating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/polar/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          productId,
          returnUrl: window.location.origin,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to start checkout');
      }
    } catch {
      setError('Failed to start checkout');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    if (!user) return;
    
    setIsOpeningPortal(true);
    setError(null);
    
    try {
      const response = await fetch('/api/polar/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          returnUrl: window.location.href,
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        setError(data.error || 'Failed to open billing portal');
      }
    } catch {
      setError('Failed to open billing portal');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isCancelled = status === 'cancelled' || subscription?.cancelAtPeriodEnd;
  const monthlyPrice = 7;
  const yearlyPrice = 55;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isPro ? 'Manage Subscription' : 'Upgrade to Pro'}
          </h2>
          <IconButton onClick={onClose} title="Close">
            <X size={18} strokeWidth={1.5} />
          </IconButton>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>Loading...</div>
          ) : (
            <>
              {error && <div className={styles.error}>{error}</div>}
              
              {isPro && subscription ? (
                /* Pro User View */
                <>
                  {/* Current Plan */}
                  <div className={styles.section}>
                    <div className={styles.label}>Current Plan</div>
                    <div className={styles.currentPlan}>
                      <div className={styles.planIcon}>
                        <Sparkles size={18} strokeWidth={1.5} />
                      </div>
                      <div className={styles.planInfo}>
                        <span className={styles.planName}>Pro {currentPlan === 'yearly' ? 'Yearly' : 'Monthly'}</span>
                        <span className={styles.planDate}>
                          {isCancelled 
                            ? `Ends ${formatDate(subscription.currentPeriodEnd)}`
                            : `Renews ${formatDate(subscription.currentPeriodEnd)}`
                          }
                        </span>
                      </div>
                      <span className={`${styles.badge} ${isCancelled ? styles.badgeCancelled : ''}`}>
                        {isCancelled ? 'Cancelling' : 'Active'}
                      </span>
                    </div>
                  </div>

                  {isCancelled && (
                    <div className={styles.warning}>
                      <p>Your subscription ends on {formatDate(subscription.currentPeriodEnd)}. You&apos;ll lose Pro features after this date.</p>
                      <p className={styles.warningHint}>To reactivate, visit the billing portal below.</p>
                    </div>
                  )}

                  {/* Billing Portal Link */}
                  <div className={styles.section}>
                    <div className={styles.label}>Billing & Invoices</div>
                    <p className={styles.portalDescription}>
                      Manage your subscription, update payment method, change plans, or cancel in the billing portal.
                    </p>
                    <Button 
                      onClick={handleOpenBillingPortal}
                      disabled={isOpeningPortal}
                      variant="secondary"
                    >
                      <CreditCard size={16} strokeWidth={1.5} />
                      {isOpeningPortal ? 'Opening...' : 'Open Billing Portal'}
                      <ExternalLink size={14} strokeWidth={1.5} />
                    </Button>
                  </div>
                </>
              ) : isPro ? (
                /* Pro but no subscription details */
                <div className={styles.section}>
                  <div className={styles.currentPlan}>
                    <div className={styles.planIcon}>
                      <Sparkles size={18} strokeWidth={1.5} />
                    </div>
                    <div className={styles.planInfo}>
                      <span className={styles.planName}>Pro</span>
                      <span className={styles.planDate}>Unable to load details</span>
                    </div>
                    <span className={styles.badge}>Active</span>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <Button 
                      onClick={handleOpenBillingPortal}
                      disabled={isOpeningPortal}
                      variant="secondary"
                    >
                      <CreditCard size={16} strokeWidth={1.5} />
                      {isOpeningPortal ? 'Opening...' : 'Open Billing Portal'}
                      <ExternalLink size={14} strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Free User - Upgrade View */
                <>
                  {/* Billing Toggle */}
                  <div className={styles.section}>
                    <div className={styles.label}>Billing</div>
                    <div className={styles.billingOptions}>
                      <button
                        className={`${styles.billingOption} ${billingInterval === 'monthly' ? styles.billingOptionSelected : ''}`}
                        onClick={() => setBillingInterval('monthly')}
                      >
                        <div className={styles.billingOptionContent}>
                          <span className={styles.billingOptionName}>Monthly</span>
                          <span className={styles.billingOptionPrice}>${monthlyPrice}/mo</span>
                        </div>
                        <div className={styles.radioButton}>
                          {billingInterval === 'monthly' && <div className={styles.radioButtonInner} />}
                        </div>
                      </button>
                      <button
                        className={`${styles.billingOption} ${billingInterval === 'yearly' ? styles.billingOptionSelected : ''}`}
                        onClick={() => setBillingInterval('yearly')}
                      >
                        <div className={styles.billingOptionContent}>
                          <div className={styles.billingOptionNameRow}>
                            <span className={styles.billingOptionName}>Yearly</span>
                            <span className={styles.saveBadge}>Save 35%</span>
                          </div>
                          <span className={styles.billingOptionPrice}>${yearlyPrice}/yr</span>
                        </div>
                        <div className={styles.radioButton}>
                          {billingInterval === 'yearly' && <div className={styles.radioButtonInner} />}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Features */}
                  <div className={styles.section}>
                    <div className={styles.label}>What&apos;s included</div>
                    <ul className={styles.featureList}>
                      {PRO_FEATURES.map((feature) => (
                        <li key={feature} className={styles.featureItem}>
                          <Check size={16} strokeWidth={2} className={styles.featureCheck} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className={styles.footer}>
          {isLoading ? (
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          ) : isPro ? (
            <Button onClick={onClose} variant="secondary">
              Done
            </Button>
          ) : (
            <>
              <Button onClick={onClose} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleUpgrade} disabled={isUpdating}>
                {isUpdating ? 'Loading...' : `Upgrade — $${billingInterval === 'yearly' ? yearlyPrice : monthlyPrice}/${billingInterval === 'yearly' ? 'yr' : 'mo'}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
