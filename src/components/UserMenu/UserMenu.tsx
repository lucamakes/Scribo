'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { SettingsModal } from '@/components/SettingsModal/SettingsModal';
import Dropdown from '@/components/Dropdown/Dropdown';
import IconButton from '@/components/IconButton/IconButton';
import { User, Settings, Sparkles, CreditCard, MessageSquare, X, Check, KeyRound } from 'lucide-react';
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
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [upgradeLoading, setUpgradeLoading] = useState(false);

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

    if (!user) return null;

    const displayEmail = user.email || 'User';
    const formattedWordCount = wordCount.toLocaleString();
    const formattedLimit = wordLimit === Infinity ? '∞' : wordLimit.toLocaleString();

    return (
        <>
            <div className={styles.container}>
                <IconButton
                    onClick={() => setIsOpen(!isOpen)}
                    size="medium"
                    title="Account menu"
                >
                    <User size={18} strokeWidth={1} />
                </IconButton>

                {isOpen && (
                    <Dropdown onClose={() => setIsOpen(false)} direction="vertical">
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
                                <CreditCard size={16} strokeWidth={1} />
                                Manage Subscription
                            </button>
                        ) : (
                            <button 
                                onClick={handleShowPricing} 
                                className={styles.upgradeButton}
                            >
                                <Sparkles size={16} strokeWidth={1} />
                                Upgrade to Pro
                            </button>
                        )}

                        <button onClick={handleOpenSettings} className={styles.menuButton}>
                            <Settings size={16} strokeWidth={1} />
                            Settings
                        </button>
                        <button onClick={() => { setIsOpen(false); setShowChangePassword(true); }} className={styles.menuButton}>
                            <KeyRound size={16} strokeWidth={1} />
                            Change Password
                        </button>
                        <button onClick={() => { setIsOpen(false); router.push('/feedback'); }} className={styles.menuButton}>
                            <MessageSquare size={16} strokeWidth={1} />
                            Feedback
                        </button>
                        <button onClick={handleLogout} className={styles.logoutButton}>
                            Log out
                        </button>
                    </Dropdown>
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
                        <IconButton 
                            onClick={() => setShowPricing(false)} 
                            title="Close"
                            className={styles.pricingCloseButton}
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
    const [currentPassword, setCurrentPassword] = useState('');
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
