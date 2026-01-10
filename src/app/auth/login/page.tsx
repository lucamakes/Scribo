'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import styles from '../auth.module.css';

/**
 * Login page component.
 */
export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signIn, loading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Get plan from URL params (monthly or yearly)
    const plan = searchParams.get('plan');

    // Helper to trigger Stripe checkout
    const triggerStripeCheckout = useCallback(async (userId: string, planType: string) => {
        const priceId = planType === 'yearly' 
            ? process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY 
            : process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;

        if (!priceId) {
            console.error('Stripe price ID not configured');
            router.push('/projects');
            return;
        }

        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    priceId,
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

        if (!email.trim() || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);

        const { error: signInError, data } = await signIn(email.trim(), password);

        if (signInError) {
            setError(signInError);
            setLoading(false);
            return;
        }

        // If user selected a paid plan, redirect to Stripe checkout
        if (plan && (plan === 'monthly' || plan === 'yearly') && data?.user?.id) {
            await triggerStripeCheckout(data.user.id, plan);
            return;
        }

        router.push('/projects');
    }, [email, password, signIn, router, plan, triggerStripeCheckout]);

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

    return (
        <main className={styles.container}>
            <div className={styles.card}>
                <div className={styles.logoSection}>
                    <h1 className={styles.title}>Welcome Back</h1>
                    <p className={styles.subtitle}>Sign in to continue to your projects</p>
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
                            autoComplete="current-password"
                            disabled={loading}
                        />
                        <Link href="/auth/forgot-password" className={styles.forgotLink}>
                            Forgot password?
                        </Link>
                    </div>

                    <button type="submit" className={styles.submitButton} disabled={loading}>
                        {loading ? (
                            <>
                                <span className={styles.buttonSpinner}></span>
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className={styles.footer}>
                    <p className={styles.footerText}>
                        Don't have an account?{' '}
                        <Link href={plan ? `/auth/signup?plan=${plan}` : '/auth/signup'} className={styles.link}>
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
