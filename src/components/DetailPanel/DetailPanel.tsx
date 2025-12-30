'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SidebarItem as SidebarItemData } from '@/types/sidebar';
import { itemService } from '@/lib/services/itemService';
import { TiptapEditor } from '@/components/TiptapEditor/TiptapEditor';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
    /** Currently selected item, or null if nothing selected */
    selectedItem: SidebarItemData | null;
    /** Callback when file content is saved */
    onContentSaved?: (itemId: string, content: string) => void;
    /** If true, opens the file in fullscreen mode */
    openInFullscreen?: boolean;
}

/**
 * Right-side detail panel that shows:
 * - Folder information when a folder is selected
 * - Rich text editor when a file is selected
 * - Empty state when nothing is selected
 */
export function DetailPanel({ selectedItem, onContentSaved, openInFullscreen, onFullscreenOpened }: DetailPanelProps) {
    const [content, setContent] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedContent = useRef('');
    const selectedItemIdRef = useRef<string | null>(null);

    // Load content when a file is selected
    useEffect(() => {
        if (selectedItem?.type === 'file') {
            // Only reset content if we're switching to a different file
            if (selectedItemIdRef.current !== selectedItem.id) {
                setContent(selectedItem.content || '');
                lastSavedContent.current = selectedItem.content || '';
                selectedItemIdRef.current = selectedItem.id;
                setSaveStatus('idle');
                setError(null);
            }
            
            // If openInFullscreen is true, set fullscreen mode
            // Use a separate effect to handle this after content is loaded
        } else {
            selectedItemIdRef.current = null;
        }
    }, [selectedItem]);
    
    // Handle fullscreen request when opening from Constellation
    useEffect(() => {
        if (openInFullscreen && selectedItem?.type === 'file') {
            setIsFullscreen(true);
            // Notify parent that fullscreen has been opened so it can reset the flag
            onFullscreenOpened?.();
        }
    }, [openInFullscreen, selectedItem, onFullscreenOpened]);

    // Handle Escape key to exit fullscreen
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };

        if (isFullscreen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isFullscreen]);

    // Auto-save with debounce
    const saveContent = useCallback(async (newContent: string) => {
        if (!selectedItem || selectedItem.type !== 'file') return;
        if (newContent === lastSavedContent.current) return;

        setSaveStatus('saving');
        setError(null);

        const result = await itemService.updateContent(selectedItem.id, newContent);

        if (result.success) {
            lastSavedContent.current = newContent;
            setSaveStatus('saved');
            onContentSaved?.(selectedItem.id, newContent);

            // Reset to idle after 2 seconds
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        } else {
            setError(result.error);
            setSaveStatus('error');
        }
    }, [selectedItem, onContentSaved]);

    // Debounced content change handler for Tiptap
    const handleContentChange = useCallback((newContent: string) => {
        setContent(newContent);

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout for auto-save (1.5 seconds after typing stops)
        saveTimeoutRef.current = setTimeout(() => {
            saveContent(newContent);
        }, 1500);
    }, [saveContent]);

    // Toggle fullscreen
    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => !prev);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Empty state - nothing selected
    if (!selectedItem) {
        return (
            <div className={styles.panel}>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📂</div>
                    <h3 className={styles.emptyTitle}>No item selected</h3>
                    <p className={styles.emptyDescription}>
                        Select a file or folder from the sidebar to view its details
                    </p>
                </div>
            </div>
        );
    }

    // Folder view
    if (selectedItem.type === 'folder') {
        const createdDate = new Date(selectedItem.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        const updatedDate = new Date(selectedItem.updatedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        return (
            <div className={styles.panel}>
                <div className={styles.folderView}>
                    <div className={styles.folderHeader}>
                        <div className={styles.folderIcon}>📁</div>
                        <h2 className={styles.folderName}>{selectedItem.name}</h2>
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
                                <span className={styles.infoValueMono}>{selectedItem.id}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.tipCard}>
                        <span className={styles.tipIcon}>💡</span>
                        <p className={styles.tipText}>
                            Use the + button in the sidebar to add files or subfolders to this folder.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // File view - rich text editor
    const editorContent = (
        <>
            <div className={styles.fileHeader}>
                <div className={styles.fileHeaderLeft}>
                    <span className={styles.fileIcon}>📄</span>
                    <h2 className={styles.fileName}>{selectedItem.name}</h2>
                </div>
                <div className={styles.fileHeaderRight}>
                    {saveStatus === 'saving' && (
                        <span className={styles.saveIndicator}>
                            <span className={styles.savingSpinner}></span>
                            Saving...
                        </span>
                    )}
                    {saveStatus === 'saved' && (
                        <span className={`${styles.saveIndicator} ${styles.saved}`}>
                            ✓ Saved
                        </span>
                    )}
                    {saveStatus === 'error' && (
                        <span className={`${styles.saveIndicator} ${styles.error}`}>
                            ✗ Error
                        </span>
                    )}
                    <button
                        onClick={toggleFullscreen}
                        className={styles.fullscreenButton}
                        title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
                    >
                        {isFullscreen ? '⤓' : '⤢'}
                    </button>
                </div>
            </div>

            {error && (
                <div className={styles.errorBanner}>
                    <span>⚠️ {error}</span>
                </div>
            )}

            <div className={styles.editorContainer}>
                <TiptapEditor
                    content={content}
                    onContentChange={handleContentChange}
                    placeholder="Start writing your story..."
                />
            </div>

            <div className={styles.editorFooter}>
                <span className={styles.footerHint}>
                    💾 Press <kbd>Ctrl</kbd> + <kbd>S</kbd> to save • Auto-saves after 1.5s of inactivity
                    {isFullscreen && ' • Press Esc to exit'}
                </span>
            </div>
        </>
    );

    // Fullscreen mode
    if (isFullscreen) {
        return (
            <>
                <div className={styles.panel}>
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>✏️</div>
                        <h3 className={styles.emptyTitle}>Editing in fullscreen</h3>
                        <p className={styles.emptyDescription}>
                            Press Esc or click the button to exit fullscreen mode
                        </p>
                    </div>
                </div>
                <div className={styles.fullscreenOverlay}>
                    <div className={styles.fullscreenEditor}>
                        {editorContent}
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className={styles.panel}>
            <div className={styles.fileView}>
                {editorContent}
            </div>
        </div>
    );
}


