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
  const { status, isPro, refresh } = useSubscription();
  
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [currentPlan, setCurrentPlan] = useState<BillingInterval | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('yearly');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/stripe/subscription?userId=${user.id}`);
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
      setIsLoading(false);
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
    
    const priceId = billingInterval === 'yearly' 
      ? process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY!
      : process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!;
    
    setIsUpdating(true);
    setError(null);
    
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
      } else {
        setError(data.error || 'Failed to start checkout');
      }
    } catch (err) {
      setError('Failed to start checkout');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePlan = async () => {
    if (!user || billingInterval === currentPlan) return;
    
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    
    setIsUpdating(true);
    setError(null);
    setShowConfirm(false);
    
    const newPriceId = billingInterval === 'yearly' 
      ? process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY!
      : process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!;
    
    try {
      const response = await fetch('/api/stripe/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newPriceId }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchSubscription();
        await refresh();
        setShowConfirm(false);
      } else {
        setError(data.error || 'Failed to change plan');
      }
    } catch (err) {
      setError('Failed to change plan');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!user) return;
    
    setIsUpdating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stripe/subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchSubscription();
        await refresh();
      } else {
        setError(data.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      setError('Failed to cancel subscription');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReactivate = async () => {
    if (!user) return;
    
    setIsUpdating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stripe/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchSubscription();
        await refresh();
      } else {
        setError(data.error || 'Failed to reactivate subscription');
      }
    } catch (err) {
      setError('Failed to reactivate subscription');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    if (!user) return;
    
    setIsOpeningPortal(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stripe/portal', {
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
    } catch (err) {
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
          <IconButton onClick={onClose} title="Close" variant="ghost">
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
                      <button 
                        className={styles.reactivateButton}
                        onClick={handleReactivate}
                        disabled={isUpdating}
                      >
                        {isUpdating ? 'Reactivating...' : 'Reactivate Subscription'}
                      </button>
                    </div>
                  )}

                  {/* Change Billing */}
                  {!isCancelled && (
                    <div className={styles.section}>
                      <div className={styles.label}>Billing Cycle</div>
                      <div className={styles.billingOptions}>
                        <button
                          className={`${styles.billingOption} ${billingInterval === 'monthly' ? styles.billingOptionSelected : ''}`}
                          onClick={() => setBillingInterval('monthly')}
                        >
                          <div className={styles.billingOptionContent}>
                            <span className={styles.billingOptionName}>Monthly</span>
                            <span className={styles.billingOptionPrice}>${monthlyPrice}/mo</span>
                          </div>
                          {currentPlan === 'monthly' && <span className={styles.currentLabel}>Current</span>}
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
                          {currentPlan === 'yearly' && <span className={styles.currentLabel}>Current</span>}
                          <div className={styles.radioButton}>
                            {billingInterval === 'yearly' && <div className={styles.radioButtonInner} />}
                          </div>
                        </button>
                      </div>

                      {billingInterval !== currentPlan && (
                        showConfirm ? (
                          <div className={styles.confirmBox}>
                            <p>
                              Your current plan continues until {formatDate(subscription.currentPeriodEnd)}, then you&apos;ll be charged ${billingInterval === 'yearly' ? yearlyPrice : monthlyPrice}/{billingInterval === 'yearly' ? 'year' : 'month'}.
                            </p>
                            <div className={styles.confirmActions}>
                              <Button onClick={() => setShowConfirm(false)} variant="secondary">
                                Cancel
                              </Button>
                              <Button onClick={handleChangePlan} disabled={isUpdating}>
                                {isUpdating ? 'Switching...' : 'Confirm'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: 12 }}>
                            <Button onClick={handleChangePlan} disabled={isUpdating}>
                              Switch to {billingInterval === 'yearly' ? 'Yearly' : 'Monthly'}
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Billing Link */}
                  <div className={styles.billingLink}>
                    <button 
                      className={styles.linkButton}
                      onClick={handleOpenBillingPortal}
                      disabled={isOpeningPortal}
                    >
                      <CreditCard size={16} strokeWidth={1.5} />
                      {isOpeningPortal ? 'Opening...' : 'View billing & invoices'}
                      <ExternalLink size={14} strokeWidth={1.5} />
                    </button>
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
          {isPro && subscription && !isCancelled ? (
            <>
              <button 
                className={styles.cancelLink}
                onClick={handleCancel}
                disabled={isUpdating}
              >
                {isUpdating ? 'Cancelling...' : 'Cancel subscription'}
              </button>
              <Button onClick={onClose} variant="secondary">
                Done
              </Button>
            </>
          ) : !isPro ? (
            <>
              <Button onClick={onClose} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleUpgrade} disabled={isUpdating}>
                {isUpdating ? 'Loading...' : `Upgrade — $${billingInterval === 'yearly' ? yearlyPrice : monthlyPrice}/${billingInterval === 'yearly' ? 'yr' : 'mo'}`}
              </Button>
            </>
          ) : (
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
