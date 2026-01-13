'use client';

import { useState, useCallback, useEffect, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { Logo } from '@/components/Logo/Logo';
import styles from './password-reset.module.css';

function PasswordResetForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { updatePassword, session, loading: authLoading } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [validSession, setValidSession] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        // Wait a bit for Supabase to process the token from URL
        const timer = setTimeout(() => {
            if (!authLoading) {
                if (session) {
                    setValidSession(true);
                }
                setChecking(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [session, authLoading]);

    const handleSubmit = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!password || !confirmPassword) {
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

        const { error: updateError } = await updatePassword(password);

        if (updateError) {
            setError(updateError);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);

        setTimeout(() => {
            router.push('/projects');
        }, 2000);
    }, [password, confirmPassword, updatePassword, router]);

    if (checking || authLoading) {
        return (
            <main className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.loadingSection}>
                        <div className={styles.spinner}></div>
                        <p className={styles.loadingText}>Verifying reset link...</p>
                    </div>
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
                        <h2 className={styles.successTitle}>Password Updated!</h2>
                        <p className={styles.successText}>
                            Your password has been successfully reset. Redirecting you to your projects...
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (!validSession) {
        return (
            <main className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.errorSection}>
                        <div className={styles.errorIcon}>!</div>
                        <h2 className={styles.errorTitle}>Invalid or Expired Link</h2>
                        <p className={styles.errorText}>
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                        <Link href="/auth/forgot-password" className={styles.linkButton}>
                            Request New Link
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <Logo size="small" />
                    <h1 className={styles.title}>Set New Password</h1>
                    <p className={styles.subtitle}>Enter your new password below</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.errorBanner}>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className={styles.field}>
                        <label htmlFor="password" className={styles.label}>New Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className={styles.input}
                            autoComplete="new-password"
                            autoFocus
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
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </main>
    );
}

function PasswordResetFallback() {
    return (
        <main className={styles.container}>
            <div className={styles.card}>
                <div className={styles.loadingSection}>
                    <div className={styles.spinner}></div>
                    <p className={styles.loadingText}>Loading...</p>
                </div>
            </div>
        </main>
    );
}

export default function PasswordResetPage() {
    return (
        <Suspense fallback={<PasswordResetFallback />}>
            <PasswordResetForm />
        </Suspense>
    );
}
