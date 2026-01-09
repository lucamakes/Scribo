'use client';

import { useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim()) {
            setError('Please enter your email');
            return;
        }

        setLoading(true);

        const { error: resetError } = await resetPassword(email.trim());

        if (resetError) {
            setError(resetError);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
    }, [email, resetPassword]);

    if (success) {
        return (
            <main className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.successSection}>
                        <h2 className={styles.successTitle}>Check your email</h2>
                        <p className={styles.successText}>
                            We've sent a password reset link to <strong>{email}</strong>. 
                            Click the link in the email to reset your password.
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
                    <h1 className={styles.title}>Reset Password</h1>
                    <p className={styles.subtitle}>Enter your email and we'll send you a reset link</p>
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

                    <button type="submit" className={styles.submitButton} disabled={loading}>
                        {loading ? (
                            <>
                                <span className={styles.buttonSpinner}></span>
                                Sending...
                            </>
                        ) : (
                            'Send Reset Link'
                        )}
                    </button>
                </form>

                <div className={styles.footer}>
                    <p className={styles.footerText}>
                        Remember your password?{' '}
                        <Link href="/auth/login" className={styles.link}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
