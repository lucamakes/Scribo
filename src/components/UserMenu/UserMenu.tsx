'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { User, Settings, X, Sparkles, CreditCard } from 'lucide-react';
import styles from './UserMenu.module.css';

/**
 * User menu component with account dropdown.
 */
export function UserMenu() {
    const { user, signOut } = useAuth();
    const { isPro, wordCount, wordLimit, percentage, isLoading: subLoading } = useSubscription();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showPricing, setShowPricing] = useState(false);
    const [upgradeLoading, setUpgradeLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleLogout = useCallback(async () => {
        await signOut();
        router.push('/auth/login');
    }, [signOut, router]);

    const handleOpenSettings = useCallback(() => {
        setIsOpen(false);
        setShowSettings(true);
    }, []);

    const handleUpgrade = useCallback(async (priceId: string) => {
        if (!user) return;
        setUpgradeLoading(true);
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
            setUpgradeLoading(false);
        }
    }, [user]);

    const handleShowPricing = useCallback(() => {
        setIsOpen(false);
        setShowPricing(true);
    }, []);

    const handleManageSubscription = useCallback(async () => {
        if (!user) return;
        setUpgradeLoading(true);
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
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Failed to open portal:', error);
        } finally {
            setUpgradeLoading(false);
        }
    }, [user]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    if (!user) return null;

    const displayEmail = user.email || 'User';
    const formattedWordCount = wordCount.toLocaleString();
    const formattedLimit = wordLimit === Infinity ? '∞' : wordLimit.toLocaleString();

    return (
        <>
            <div className={styles.container} ref={menuRef}>
                <button 
                    onClick={() => setIsOpen(!isOpen)} 
                    className={styles.accountButton}
                    aria-label="Account menu"
                >
                    <User size={16} strokeWidth={1.5} />
                    Account
                </button>

                {isOpen && (
                    <div className={styles.dropdown}>
                        <div className={styles.dropdownHeader}>
                            <span className={styles.email}>{displayEmail}</span>
                        </div>
                        
                        {!isPro && !subLoading && (
                            <div className={styles.wordCountSection}>
                                <div className={styles.wordCountBar}>
                                    <div 
                                        className={styles.wordCountFill} 
                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                </div>
                                <span className={styles.wordCountText}>
                                    {formattedWordCount} / {formattedLimit} words
                                </span>
                            </div>
                        )}

                        {isPro ? (
                            <button 
                                onClick={handleManageSubscription} 
                                className={styles.menuButton}
                                disabled={upgradeLoading}
                            >
                                <CreditCard size={16} strokeWidth={1.5} />
                                Manage Subscription
                            </button>
                        ) : (
                            <button 
                                onClick={handleShowPricing} 
                                className={styles.upgradeButton}
                            >
                                <Sparkles size={16} strokeWidth={1.5} />
                                Upgrade to Pro
                            </button>
                        )}

                        <button onClick={handleOpenSettings} className={styles.menuButton}>
                            <Settings size={16} strokeWidth={1.5} />
                            Settings
                        </button>
                        <button onClick={handleLogout} className={styles.logoutButton}>
                            Log out
                        </button>
                    </div>
                )}
            </div>

            {showSettings && (
                <div className={styles.modalOverlay} onClick={() => setShowSettings(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Settings</h2>
                            <button 
                                onClick={() => setShowSettings(false)} 
                                className={styles.closeButton}
                                aria-label="Close"
                            >
                                <X size={20} strokeWidth={1.5} />
                            </button>
                        </div>
                        <div className={styles.modalContent}>
                            <div className={styles.settingSection}>
                                <h3 className={styles.sectionTitle}>Account</h3>
                                <div className={styles.settingItem}>
                                    <span className={styles.settingLabel}>Email</span>
                                    <span className={styles.settingValue}>{displayEmail}</span>
                                </div>
                                <div className={styles.settingItem}>
                                    <span className={styles.settingLabel}>Plan</span>
                                    <span className={styles.settingValue}>{isPro ? 'Pro' : 'Free'}</span>
                                </div>
                            </div>
                            
                            {!isPro && (
                                <div className={styles.settingSection}>
                                    <h3 className={styles.sectionTitle}>Usage</h3>
                                    <div className={styles.settingItem}>
                                        <span className={styles.settingLabel}>Words used</span>
                                        <span className={styles.settingValue}>
                                            {formattedWordCount} / {formattedLimit}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showPricing && (
                <div className={styles.modalOverlay} onClick={() => setShowPricing(false)}>
                    <div className={styles.pricingModal} onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={() => setShowPricing(false)} 
                            className={styles.pricingCloseButton}
                            aria-label="Close"
                        >
                            <X size={18} strokeWidth={1.5} />
                        </button>
                        
                        <div className={styles.pricingHeader}>
                            <div className={styles.pricingIcon}>
                                <Sparkles size={24} strokeWidth={1.5} />
                            </div>
                            <h2 className={styles.pricingTitle}>Upgrade to Pro</h2>
                            <p className={styles.pricingSubtitle}>Unlimited words, unlimited creativity</p>
                        </div>

                        <div className={styles.pricingPlans}>
                            <button
                                onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!)}
                                className={styles.pricingPlan}
                                disabled={upgradeLoading}
                            >
                                <span className={styles.planName}>Monthly</span>
                                <span className={styles.planPrice}>$5<span className={styles.planPeriod}>/mo</span></span>
                            </button>
                            
                            <button
                                onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY!)}
                                className={`${styles.pricingPlan} ${styles.pricingPlanPrimary}`}
                                disabled={upgradeLoading}
                            >
                                <span className={styles.planBadge}>Best Value</span>
                                <span className={styles.planName}>Yearly</span>
                                <span className={styles.planPrice}>$40<span className={styles.planPeriod}>/yr</span></span>
                                <span className={styles.planSaving}>Save 33%</span>
                            </button>
                        </div>

                        <p className={styles.pricingFooter}>Cancel anytime. Your writing is always yours.</p>
                    </div>
                </div>
            )}
        </>
    );
}
