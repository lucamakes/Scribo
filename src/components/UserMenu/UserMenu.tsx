'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { getImageStorageUsage } from '@/lib/services/storageService';
import { SettingsModal } from '@/components/SettingsModal/SettingsModal';
import { SubscriptionModal } from '@/components/SubscriptionModal/SubscriptionModal';
import IconButton from '@/components/IconButton/IconButton';
import { User, Settings, Sparkles, CreditCard, MessageSquare, X, Check, KeyRound, LogOut } from 'lucide-react';
import styles from './UserMenu.module.css';

/**
 * User menu component with account dropdown.
 */
export function UserMenu() {
    const { user, signOut } = useAuth();
    const { isPro, wordCount, wordLimit, percentage, isLoading: subLoading, refresh } = useSubscription();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showPricing, setShowPricing] = useState(false);
    const [showSubscription, setShowSubscription] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [upgradeLoading, setUpgradeLoading] = useState(false);
    const [imageStorage, setImageStorage] = useState<{ usedBytes: number; limitBytes: number } | null>(null);
    const [checkoutSuccess, setCheckoutSuccess] = useState(false);
    const [activating, setActivating] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const isProRef = useRef(isPro);
    const successHandled = useRef(false);

    // Keep a ref in sync so the polling loop can read the latest value
    useEffect(() => {
        isProRef.current = isPro;
    }, [isPro]);

    // Auto-refresh subscription status after successful checkout
    useEffect(() => {
        const success = searchParams.get('success');
        if (success !== 'true' || successHandled.current) return;

        // Only run this flow once per return from checkout
        successHandled.current = true;

        // Clean the URL right away so a refresh doesn't replay this flow
        const url = new URL(window.location.href);
        url.searchParams.delete('success');
        url.searchParams.delete('checkout_id');
        url.searchParams.delete('customer_session_token');
        window.history.replaceState({}, '', url.pathname);

        let attempts = 0;
        const maxAttempts = 10;
        let timeoutId: ReturnType<typeof setTimeout>;

        setActivating(true);
        setCheckoutSuccess(true);

        const pollSubscription = async () => {
            await refresh();
            attempts++;

            // The webhook flips the DB to "pro"; keep polling until it lands
            if (isProRef.current) {
                setActivating(false);
            } else if (attempts < maxAttempts) {
                timeoutId = setTimeout(pollSubscription, 1500);
            } else {
                // Webhook hasn't landed yet; stop spinning but keep the
                // confirmation visible so the user isn't left hanging.
                setActivating(false);
            }
        };

        // Start polling after a short delay to let the webhook process
        timeoutId = setTimeout(pollSubscription, 1000);

        return () => clearTimeout(timeoutId);
    }, [searchParams, refresh]);

    // Close menu when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (
                menuRef.current && 
                !menuRef.current.contains(e.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Load image storage usage when the menu opens
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        getImageStorageUsage()
            .then((usage) => {
                if (!cancelled) {
                    setImageStorage({ usedBytes: usage.usedBytes, limitBytes: usage.limitBytes });
                }
            })
            .catch((err) => console.error('Failed to load image storage usage:', err));
        return () => { cancelled = true; };
    }, [isOpen]);

    const handleLogout = useCallback(async () => {
        await signOut();
        router.push('/auth/login');
    }, [signOut, router]);

    const handleOpenSettings = useCallback(() => {
        setIsOpen(false);
        setShowSettings(true);
    }, []);

    const handleUpgrade = useCallback(async (productId: string) => {
        if (!user) return;
        setUpgradeLoading(true);
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

    const handleManageSubscription = useCallback(() => {
        setIsOpen(false);
        setShowSubscription(true);
    }, []);

    if (!user) return null;

    const displayEmail = user.email || 'User';
    const formattedWordCount = wordCount.toLocaleString();
    const formattedLimit = wordLimit === Infinity ? '∞' : wordLimit.toLocaleString();

    return (
        <>
            <div className={styles.container}>
                <IconButton
                    ref={buttonRef}
                    onClick={() => setIsOpen(!isOpen)}
                    size="medium"
                    title="Account menu"
                >
                    <User size={18} strokeWidth={1.5} />
                </IconButton>

                {isOpen && (
                    <div className={styles.menuDropdown} ref={menuRef}>
                        <div className={styles.menuHeader}>
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

                        {imageStorage && (() => {
                            const usedMb = imageStorage.usedBytes / (1024 * 1024);
                            const limitMb = imageStorage.limitBytes / (1024 * 1024);
                            const pct = imageStorage.limitBytes > 0
                                ? Math.min(100, (imageStorage.usedBytes / imageStorage.limitBytes) * 100)
                                : 0;
                            const fillClass = pct >= 100
                                ? styles.storageFillFull
                                : pct >= 80
                                    ? styles.storageFillNear
                                    : '';
                            return (
                                <div className={styles.wordCountSection}>
                                    <div className={styles.wordCountBar}>
                                        <div
                                            className={`${styles.wordCountFill} ${fillClass}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className={styles.wordCountText}>
                                        {usedMb.toFixed(1)} / {limitMb.toFixed(0)} MB images
                                    </span>
                                </div>
                            );
                        })()}

                        <div className={styles.menuItems}>
                            {isPro ? (
                                <button 
                                    onClick={handleManageSubscription} 
                                    className={styles.menuItem}
                                >
                                    <CreditCard size={14} strokeWidth={1.5} />
                                    <span>Manage Subscription</span>
                                </button>
                            ) : (
                                <button 
                                    onClick={handleShowPricing} 
                                    className={styles.upgradeItem}
                                >
                                    <Sparkles size={14} strokeWidth={1.5} />
                                    <span>Upgrade to Pro</span>
                                </button>
                            )}

                            <button onClick={handleOpenSettings} className={styles.menuItem}>
                                <Settings size={14} strokeWidth={1.5} />
                                <span>Settings</span>
                            </button>
                            <button onClick={() => { setIsOpen(false); setShowChangePassword(true); }} className={styles.menuItem}>
                                <KeyRound size={14} strokeWidth={1.5} />
                                <span>Change Password</span>
                            </button>
                            <button onClick={() => { setIsOpen(false); router.push('/feedback'); }} className={styles.menuItem}>
                                <MessageSquare size={14} strokeWidth={1.5} />
                                <span>Feedback</span>
                            </button>
                            
                            <div className={styles.menuDivider} />
                            
                            <button onClick={handleLogout} className={`${styles.menuItem} ${styles.menuItemDanger}`}>
                                <LogOut size={14} strokeWidth={1.5} />
                                <span>Log out</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showSettings && (
                <SettingsModal 
                    isOpen={showSettings} 
                    onClose={() => setShowSettings(false)} 
                />
            )}

            {showSubscription && (
                <SubscriptionModal 
                    isOpen={showSubscription} 
                    onClose={() => setShowSubscription(false)} 
                />
            )}

            {showPricing && (
                <div className={styles.modalOverlay} onClick={() => setShowPricing(false)}>
                    <div className={styles.pricingModal} onClick={(e) => e.stopPropagation()}>
                        <IconButton 
                            onClick={() => setShowPricing(false)} 
                            title="Close"
                            className={styles.pricingCloseButton}
                            variant="ghost"
                        >
                            <X size={18} strokeWidth={1.5} />
                        </IconButton>
                        
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
                                    onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_POLAR_PRODUCT_MONTHLY!)}
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
                                    onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_POLAR_PRODUCT_YEARLY!)}
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

            {checkoutSuccess && (
                <div className={styles.modalOverlay}>
                    <div className={styles.successModal}>
                        {activating ? (
                            <>
                                <div className={styles.successSpinner} />
                                <h2 className={styles.successTitle}>Activating your subscription…</h2>
                                <p className={styles.successSubtitle}>
                                    Your payment went through. We&apos;re just confirming things with our payment provider.
                                </p>
                            </>
                        ) : isPro ? (
                            <>
                                <div className={styles.successIcon}>
                                    <Sparkles size={28} strokeWidth={1.5} />
                                </div>
                                <h2 className={styles.successTitle}>Welcome to Pro!</h2>
                                <p className={styles.successSubtitle}>
                                    Your subscription is active. Enjoy unlimited words and all Pro features.
                                </p>
                                <button
                                    className={styles.successButton}
                                    onClick={() => setCheckoutSuccess(false)}
                                >
                                    Start writing
                                </button>
                            </>
                        ) : (
                            <>
                                <div className={styles.successIcon}>
                                    <Check size={28} strokeWidth={1.5} />
                                </div>
                                <h2 className={styles.successTitle}>Payment received</h2>
                                <p className={styles.successSubtitle}>
                                    Thanks! Your subscription is being set up and should be active in a moment.
                                    If your plan doesn&apos;t update shortly, try refreshing the page.
                                </p>
                                <button
                                    className={styles.successButton}
                                    onClick={() => setCheckoutSuccess(false)}
                                >
                                    Got it
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {showChangePassword && (
                <ChangePasswordModal 
                    isOpen={showChangePassword} 
                    onClose={() => setShowChangePassword(false)} 
                />
            )}
        </>
    );
}

// Change Password Modal Component
function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { updatePassword } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!newPassword || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        const { error: updateError } = await updatePassword(newPassword);

        if (updateError) {
            setError(updateError);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);

        setTimeout(() => {
            onClose();
            setSuccess(false);
            setNewPassword('');
            setConfirmPassword('');
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.changePasswordModal} onClick={(e) => e.stopPropagation()}>
                <IconButton 
                    onClick={onClose} 
                    title="Close"
                    className={styles.pricingCloseButton}
                    variant="ghost"
                >
                    <X size={18} strokeWidth={1.5} />
                </IconButton>

                <div className={styles.changePasswordHeader}>
                    <h2 className={styles.changePasswordTitle}>Change Password</h2>
                    <p className={styles.changePasswordSubtitle}>Enter your new password below</p>
                </div>

                {success ? (
                    <div className={styles.successMessage}>
                        <Check size={24} strokeWidth={2} />
                        <span>Password updated successfully!</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className={styles.changePasswordForm}>
                        {error && (
                            <div className={styles.errorBanner}>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className={styles.formField}>
                            <label htmlFor="newPassword" className={styles.formLabel}>New Password</label>
                            <input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className={styles.formInput}
                                autoComplete="new-password"
                                autoFocus
                                disabled={loading}
                            />
                            <span className={styles.formHint}>Minimum 6 characters</span>
                        </div>

                        <div className={styles.formField}>
                            <label htmlFor="confirmPassword" className={styles.formLabel}>Confirm Password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className={styles.formInput}
                                autoComplete="new-password"
                                disabled={loading}
                            />
                        </div>

                        <button type="submit" className={styles.submitButton} disabled={loading}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
