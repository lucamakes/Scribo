'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { User, Settings, X } from 'lucide-react';
import styles from './UserMenu.module.css';

/**
 * User menu component with account dropdown.
 */
export function UserMenu() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleLogout = useCallback(async () => {
        await signOut();
        router.push('/auth/login');
    }, [signOut, router]);

    const handleOpenSettings = useCallback(() => {
        setIsOpen(false);
        setShowSettings(true);
    }, []);

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
                        <button onClick={handleOpenSettings} className={styles.menuButton}>
                            <Settings size={16} strokeWidth={1.5} />
                            Settings
                        </button>
                        <button onClick={handleLogout} className={styles.logoutButton}>
                            Log out
                        </button>
                    </div>
                )}
            </div>

            {showSettings && (
                <div className={styles.modalOverlay} onClick={() => setShowSettings(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Settings</h2>
                            <button 
                                onClick={() => setShowSettings(false)} 
                                className={styles.closeButton}
                                aria-label="Close"
                            >
                                <X size={20} strokeWidth={1.5} />
                            </button>
                        </div>
                        <div className={styles.modalContent}>
                            <div className={styles.settingSection}>
                                <h3 className={styles.sectionTitle}>Account</h3>
                                <div className={styles.settingItem}>
                                    <span className={styles.settingLabel}>Email</span>
                                    <span className={styles.settingValue}>{displayEmail}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
