'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import styles from './UserMenu.module.css';

/**
 * User menu component displaying user email and logout button.
 */
export function UserMenu() {
    const { user, signOut } = useAuth();
    const router = useRouter();

    const handleLogout = useCallback(async () => {
        await signOut();
        router.push('/auth/login');
    }, [signOut, router]);

    if (!user) return null;

    const displayEmail = user.email || 'User';

    return (
        <div className={styles.container}>
            <span className={styles.email}>{displayEmail}</span>
            <button onClick={handleLogout} className={styles.logoutButton}>
                Log out
            </button>
        </div>
    );
}
