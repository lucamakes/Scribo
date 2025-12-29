'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import styles from '../auth.module.css';

/**
 * Signup page component.
 */
export default function SignupPage() {
    const router = useRouter();
    const { signUp, signIn, loading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

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
        const { error: signInError } = await signIn(email.trim(), password);

        if (signInError) {
            // Email confirmation might be required
            setSuccess(true);
            setLoading(false);
            return;
        }

        router.push('/projects');
    }, [email, password, confirmPassword, signUp, signIn, router]);

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
                        <div className={styles.successIcon}>✓</div>
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
                    <div className={styles.logo}>📚</div>
                    <h1 className={styles.title}>Create Account</h1>
                    <p className={styles.subtitle}>Start organizing your projects today</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.errorBanner}>
                            <span>⚠️ {error}</span>
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
                        <Link href="/auth/login" className={styles.link}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
