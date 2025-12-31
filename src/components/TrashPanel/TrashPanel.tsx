'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ItemRow } from '@/types/database';
import { itemService } from '@/lib/services/itemService';
import styles from './TrashPanel.module.css';
import { Trash2, X, Folder, File, Undo } from 'lucide-react';

interface TrashPanelProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Trash panel showing deleted items with restore/permanent delete options.
 * Items are automatically deleted after 14 days.
 */
export function TrashPanel({ projectId, isOpen, onClose }: TrashPanelProps) {
    const [items, setItems] = useState<ItemRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTrash = useCallback(async () => {
        setLoading(true);
        setError(null);

        // Also trigger cleanup of old items
        await itemService.cleanupOldTrash();

        const result = await itemService.getTrash(projectId);
        if (result.success) {
            setItems(result.data);
        } else {
            setError((result as { success: false; error: string }).error);
        }
        setLoading(false);
    }, [projectId]);

    useEffect(() => {
        if (isOpen) {
            loadTrash();
        }
    }, [isOpen, loadTrash]);

    const handleRestore = async (id: string) => {
        const result = await itemService.restore(id);
        if (result.success) {
            setItems(prev => prev.filter(item => item.id !== id));
        } else {
            setError((result as { success: false; error: string }).error);
        }
    };

    const handlePermanentDelete = async (id: string) => {
        const result = await itemService.permanentDelete(id);
        if (result.success) {
            setItems(prev => prev.filter(item => item.id !== id));
        } else {
            setError((result as { success: false; error: string }).error);
        }
    };

    const handleEmptyTrash = async () => {
        if (!confirm('Are you sure you want to permanently delete all items in trash?')) {
            return;
        }

        const result = await itemService.emptyTrash(projectId);
        if (result.success) {
            setItems([]);
        } else {
            setError((result as { success: false; error: string }).error);
        }
    };

    const formatDeletedDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = 14 - diffDays;

        if (daysRemaining <= 1) {
            return 'Deleting soon';
        }
        return `${daysRemaining} days left`;
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.panel} onClick={e => e.stopPropagation()}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <Trash2 size={20} strokeWidth={1} className={styles.icon} />
                        <h2 className={styles.title}>Trash</h2>
                    </div>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={20} strokeWidth={1} />
                    </button>
                </header>

                <p className={styles.subtitle}>
                    Items are automatically deleted after 14 days
                </p>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.content}>
                    {loading ? (
                        <div className={styles.loading}>Loading...</div>
                    ) : items.length === 0 ? (
                        <div className={styles.empty}>
                            <Trash2 size={48} strokeWidth={1} className={styles.emptyIcon} />
                            <p>Trash is empty</p>
                        </div>
                    ) : (
                        <ul className={styles.list}>
                            {items.map(item => (
                                <li key={item.id} className={styles.item}>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemIcon}>
                                            {item.type === 'folder'
                                                ? <Folder size={16} strokeWidth={1} data-type="folder" />
                                                : <File size={16} strokeWidth={1} data-type="file" />
                                            }
                                        </span>
                                        <span className={styles.itemName}>{item.name}</span>
                                        <span className={styles.itemExpiry}>
                                            {item.deleted_at && formatDeletedDate(item.deleted_at)}
                                        </span>
                                    </div>
                                    <div className={styles.itemActions}>
                                        <button
                                            onClick={() => handleRestore(item.id)}
                                            className={styles.restoreButton}
                                            title="Restore"
                                        >
                                            <Undo size={16} strokeWidth={1} />
                                        </button>
                                        <button
                                            onClick={() => handlePermanentDelete(item.id)}
                                            className={styles.deleteButton}
                                            title="Delete permanently"
                                        >
                                            <X size={16} strokeWidth={1} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {items.length > 0 && (
                    <footer className={styles.footer}>
                        <button onClick={handleEmptyTrash} className={styles.emptyButton}>
                            Empty Trash
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
}
