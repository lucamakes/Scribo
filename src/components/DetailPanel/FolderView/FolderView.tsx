'use client';

import { Lightbulb, X } from 'lucide-react';
import type { SidebarItem } from '@/types/sidebar';
import styles from '../DetailPanel.module.css';
import local from './FolderView.module.css';

interface FolderViewProps {
    /** Folder being inspected */
    item: SidebarItem;
    /** Returns to the file list on a narrow screen */
    onBackToMaster?: () => void;
}

/**
 * Folder details shown in the detail panel.
 */
export function FolderView({ item, onBackToMaster }: FolderViewProps) {
    const createdDate = new Date(item.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    const updatedDate = new Date(item.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className={`${styles.panel} ${local.root}`}>
            <button
                onClick={onBackToMaster}
                className={styles.mobileBackButton}
                aria-label="Back to files"
            >
                <X size={20} strokeWidth={1.5} />
            </button>
            <div className={styles.folderView}>
                <div className={styles.folderHeader}>
                    <h2 className={styles.folderName}>{item.name}</h2>
                </div>
                <div className={styles.infoCard}>
                    <h3 className={styles.infoCardTitle}>Folder Information</h3>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Type</span>
                            <span className={styles.infoValue}>Folder</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Created</span>
                            <span className={styles.infoValue}>{createdDate}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Modified</span>
                            <span className={styles.infoValue}>{updatedDate}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>ID</span>
                            <span className={styles.infoValueMono}>{item.id}</span>
                        </div>
                    </div>
                </div>
                <div className={styles.tipCard}>
                    <Lightbulb size={24} strokeWidth={1.5} className={styles.tipIcon} />
                    <p className={styles.tipText}>
                        Hover over items in the sidebar to reveal buttons for renaming, deleting, or adding subfolders.
                    </p>
                </div>
            </div>
        </div>
    );
}
