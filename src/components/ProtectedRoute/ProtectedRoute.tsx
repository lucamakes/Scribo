'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import styles from './ProtectedRoute.module.css';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * Wrapper component that protects routes from unauthenticated access.
 * Redirects to login if user is not authenticated.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/auth/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p className={styles.loadingText}>Loading...</p>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
}
