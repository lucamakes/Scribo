'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { SettingsModal } from '@/components/SettingsModal/SettingsModal';
import { User, Settings, Sparkles, CreditCard, MessageSquare, X, Check } from 'lucide-react';
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
                        <button onClick={() => { setIsOpen(false); router.push('/feedback'); }} className={styles.menuButton}>
                            <MessageSquare size={16} strokeWidth={1.5} />
                            Feedback
                        </button>
                        <button onClick={handleLogout} className={styles.logoutButton}>
                            Log out
                        </button>
                    </div>
                )}
            </div>

            {showSettings && (
                <SettingsModal 
                    isOpen={showSettings} 
                    onClose={() => setShowSettings(false)} 
                />
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
                            <h2 className={styles.pricingTitle}>Simple, honest pricing</h2>
                            <p className={styles.pricingSubtitle}>Start free. Upgrade when you need more words.</p>
                        </div>

                        <div className={styles.pricingPlans}>
                            {/* Free Plan */}
                            <div className={styles.pricingPlan}>
                                <h3 className={styles.planName}>Free</h3>
                                <div className={styles.planPriceWrap}>
                                    <span className={styles.planPrice}>$0</span>
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
                            <div className={styles.pricingPlan}>
                                <h3 className={styles.planName}>Pro Monthly</h3>
                                <div className={styles.planPriceWrap}>
                                    <span className={styles.planPrice}>$7</span>
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
                                    disabled={upgradeLoading}
                                >
                                    {upgradeLoading ? 'Loading...' : 'Upgrade'}
                                </button>
                            </div>

                            {/* Pro Yearly - Recommended */}
                            <div className={`${styles.pricingPlan} ${styles.pricingPlanPrimary}`}>
                                <div className={styles.planBadge}>Recommended</div>
                                <h3 className={styles.planName}>Pro Yearly</h3>
                                <div className={styles.planPriceWrap}>
                                    <span className={styles.planPrice}>$55</span>
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
                                    disabled={upgradeLoading}
                                >
                                    {upgradeLoading ? 'Loading...' : 'Upgrade'}
                                </button>
                            </div>
                        </div>

                        <p className={styles.pricingFooter}>Cancel anytime. Your writing is always yours.</p>
                    </div>
                </div>
            )}
        </>
    );
}
