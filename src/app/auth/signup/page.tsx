'use client';

import { useState, useCallback, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { demoMigrationService } from '@/lib/services/demoMigrationService';
import styles from '../auth.module.css';

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signUp, signIn, loading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    
    // Get plan from URL params (monthly or yearly)
    const plan = searchParams.get('plan');

    // Helper to trigger Polar checkout
    const triggerPolarCheckout = useCallback(async (userId: string, planType: string) => {
        const productId = planType === 'yearly' 
            ? process.env.NEXT_PUBLIC_POLAR_PRODUCT_YEARLY 
            : process.env.NEXT_PUBLIC_POLAR_PRODUCT_MONTHLY;

        if (!productId) {
            console.error('Polar product ID not configured');
            router.push('/projects');
            return;
        }

        try {
            const response = await fetch('/api/polar/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    productId,
                    returnUrl: window.location.origin,
                }),
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error('Failed to create checkout session:', data.error);
                router.push('/projects');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            router.push('/projects');
        }
    }, [router]);

    const handleSubmit = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        const { error: signUpError } = await signUp(email.trim(), password);

        if (signUpError) {
            setError(signUpError);
            setLoading(false);
            return;
        }

        // If email confirmation is disabled, auto-login
        const { error: signInError, data } = await signIn(email.trim(), password);

        if (signInError) {
            // Email confirmation might be required
            setSuccess(true);
            setLoading(false);
            return;
        }

        // If user selected a paid plan, redirect to Polar checkout
        if (plan && (plan === 'monthly' || plan === 'yearly') && data?.user?.id) {
            // Mark as new signup so demo data gets imported
            demoMigrationService.markAsNewSignup();
            await triggerPolarCheckout(data.user.id, plan);
            return;
        }

        // Mark as new signup so demo data gets imported
        demoMigrationService.markAsNewSignup();
        router.push('/projects');
    }, [email, password, confirmPassword, signUp, signIn, router, plan, triggerPolarCheckout]);

    if (authLoading) {
        return (
            <main className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.loadingSpinner}></div>
                    <p className={styles.loadingText}>Loading...</p>
                </div>
            </main>
        );
    }

    if (success) {
        return (
            <main className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.successSection}>
                        <h2 className={styles.successTitle}>Check your email</h2>
                        <p className={styles.successText}>
                            We've sent you a confirmation link. Please check your email to verify your account.
                        </p>
                        <Link href="/auth/login" className={styles.successLink}>
                            Back to Login
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.container}>
            <div className={styles.card}>
                <div className={styles.logoSection}>
                    <h1 className={styles.title}>Create Account</h1>
                    <p className={styles.subtitle}>Start organizing your projects today</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.errorBanner}>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className={styles.field}>
                        <label htmlFor="email" className={styles.label}>Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className={styles.input}
                            autoComplete="email"
                            autoFocus
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="password" className={styles.label}>Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className={styles.input}
                            autoComplete="new-password"
                            disabled={loading}
                        />
                        <span className={styles.hint}>Minimum 6 characters</span>
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className={styles.input}
                            autoComplete="new-password"
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className={styles.submitButton} disabled={loading}>
                        {loading ? (
                            <>
                                <span className={styles.buttonSpinner}></span>
                                Creating account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className={styles.footer}>
                    <p className={styles.footerText}>
                        Already have an account?{' '}
                        <Link href={plan ? `/auth/login?plan=${plan}` : '/auth/login'} className={styles.link}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}

function SignupFallback() {
    return (
        <main className={styles.container}>
            <div className={styles.card}>
                <div className={styles.loadingSpinner}></div>
                <p className={styles.loadingText}>Loading...</p>
            </div>
        </main>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<SignupFallback />}>
            <SignupForm />
        </Suspense>
    );
}
