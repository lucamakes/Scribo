'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SidebarItem as SidebarItemData } from '@/types/sidebar';
import { itemService } from '@/lib/services/itemService';
import { TiptapEditor } from '@/components/TiptapEditor/TiptapEditor';
import {
    Folder,
    FileText,
    Lightbulb,
    Check,
    X,
    Maximize2,
    Minimize2,
    AlertTriangle,
    Save,
    Pencil,
    Eye,
    EyeClosed
} from 'lucide-react';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
    /** Currently selected item, or null if nothing selected */
    selectedItem: SidebarItemData | null;
    /** Callback when file content is saved */
    onContentSaved?: (itemId: string, content: string) => void;
    /** If true, opens the file in fullscreen mode */
    openInFullscreen?: boolean;
    /** Callback invoked when fullscreen mode has been opened */
    onFullscreenOpened?: () => void;
    /** Callback to return to master list on mobile */
    onBackToMaster?: () => void;
}

/**
 * Right-side detail panel that shows:
 * - Folder information when a folder is selected
 * - Rich text editor when a file is selected
 * - Empty state when nothing is selected
 */
export function DetailPanel({ selectedItem, onContentSaved, openInFullscreen, onFullscreenOpened, onBackToMaster }: DetailPanelProps) {
    const [content, setContent] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
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
            if (e.key === 'Escape' && (isFullscreen || isFocusMode)) {
                setIsFocusMode(false);
                setIsFullscreen(false);
                // On mobile, also go back to master
                if (window.innerWidth <= 768) {
                    onBackToMaster?.();
                }
            }
        };

        if (isFullscreen || isFocusMode) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isFullscreen, isFocusMode, onBackToMaster]);

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
            setError((result as { success: false; error: string }).error);
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
        const newFullscreenState = !isFullscreen;
        setIsFullscreen(newFullscreenState);
        
        // On mobile, if exiting fullscreen, go back to master
        if (!newFullscreenState && window.innerWidth <= 768) {
            onBackToMaster?.();
        }
    }, [isFullscreen, onBackToMaster]);

    // Toggle focus mode
    const toggleFocusMode = useCallback(() => {
        setIsFocusMode(prev => {
            const newFocusMode = !prev;
            // If entering focus mode and not in fullscreen, enable fullscreen
            if (newFocusMode && !isFullscreen) {
                setIsFullscreen(true);
            }
            return newFocusMode;
        });
    }, [isFullscreen]);

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
                <div className={styles.emptyStateWrapper}>
                    <div className={styles.emptyState}>
                        <h3 className={styles.emptyTitle}>No item selected</h3>
                        <p className={styles.emptyDescription}>
                            Select a file or folder from the sidebar to view its details
                        </p>
                    </div>
                    <div className={styles.tipCard}>
                        <Lightbulb size={24} strokeWidth={1} className={styles.tipIcon} />
                        <p className={styles.tipText}>
                            Hover over items in the sidebar to reveal buttons for renaming, deleting, or adding subfolders.
                        </p>
                    </div>
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
                <button
                    onClick={onBackToMaster}
                    className={styles.mobileBackButton}
                    aria-label="Back to files"
                >
                    <X size={20} strokeWidth={1.5} />
                </button>
                <div className={styles.folderView}>
                    <div className={styles.folderHeader}>
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
                        <Lightbulb size={24} strokeWidth={1} className={styles.tipIcon} />
                        <p className={styles.tipText}>
                            Hover over items in the sidebar to reveal buttons for renaming, deleting, or adding subfolders.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // File view - rich text editor
    // Calculate statistics
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const readingTime = Math.ceil(wordCount / 225); // 225 words per minute average
    const pageCount = (wordCount / 250).toFixed(1); // ~250 words per page
    
    const editorContent = (
        <>
            <div className={`${styles.fileHeader} ${isFocusMode ? styles.fileHeaderHidden : ''}`}>
                <div className={styles.fileHeaderLeft}>
                    <h2 className={styles.fileName}>
                        {selectedItem.name.length > 25 
                            ? selectedItem.name.slice(0, 25) + '...' 
                            : selectedItem.name}
                    </h2>
                </div>
                <div className={styles.fileHeaderRight}>
                        <button
                            onClick={() => saveContent(content)}
                            className={`${styles.saveButton} ${content === lastSavedContent.current ? styles.saved : styles.unsaved}`}
                            disabled={saveStatus === 'saving' || content === lastSavedContent.current}
                            title={content === lastSavedContent.current ? 'All changes saved' : 'Save now (Ctrl+S)'}
                        >
                            {content === lastSavedContent.current ? (
                                <Check size={16} strokeWidth={2} />
                            ) : (
                                <div className={styles.unsavedDot} />
                            )}
                        </button>
                        <div className={styles.statistics}>
                            <span className={styles.stat}>
                                {wordCount.toLocaleString()} words
                            </span>
                            <span className={styles.statDivider}>•</span>
                            <span className={styles.stat}>
                                {readingTime} min read
                            </span>
                            <span className={styles.statDivider}>•</span>
                            <span className={styles.stat}>
                                {pageCount} pages
                            </span>
                        </div>
                        <button
                            onClick={onBackToMaster}
                            className={styles.mobileCloseButton}
                            title="Back to files"
                        >
                            <X size={18} strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            className={styles.fullscreenButton}
                            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 size={18} strokeWidth={1} /> : <Maximize2 size={18} strokeWidth={1} />}
                        </button>
                    </div>
                </div>

            {error && (
                <div className={styles.errorBanner}>
                    <span><AlertTriangle size={16} strokeWidth={1} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {error}</span>
                </div>
            )}

            <div className={styles.editorContainer}>
                <TiptapEditor
                    content={content}
                    onContentChange={handleContentChange}
                    placeholder="Start writing your story..."
                />
            </div>

            {isFullscreen && (
                <button
                    onClick={toggleFocusMode}
                    className={`${styles.focusButton} ${isFocusMode ? styles.focusButtonActive : ''}`}
                    title={isFocusMode ? 'Exit focus mode' : 'Enter focus mode (hide header)'}
                >
                    {isFocusMode ? (
                        <EyeClosed size={18} strokeWidth={1} />
                    ) : (
                        <Eye size={18} strokeWidth={1} />
                    )}
                </button>
            )}
        </>
    );

    // Fullscreen mode
    if (isFullscreen) {
        return (
            <>
              
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


