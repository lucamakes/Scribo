'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { SidebarItem as SidebarItemData } from '@/types/sidebar';
import { goalService } from '@/lib/services/goalService';
import { useDataServiceOptional } from '@/lib/services/dataService';
import { TiptapEditor } from '@/components/TiptapEditor/TiptapEditor';
import { CanvasEditor } from '@/components/CanvasEditor/CanvasEditor';
import { UpgradePrompt } from '@/components/UpgradePrompt/UpgradePrompt';
import { VersionHistory } from '@/components/VersionHistory/VersionHistory';
import IconButton from '@/components/IconButton/IconButton';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { usePreferences } from '@/lib/hooks/usePreferences';
import {
    Lightbulb,
    Check,
    X,
    Maximize2,
    Minimize2,
    AlertTriangle,
    History,
    Eye,
    EyeClosed
} from 'lucide-react';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
    /** Currently selected item, or null if nothing selected */
    selectedItem: SidebarItemData | null;
    /** Project ID for tracking goals */
    projectId?: string;
    /** Callback when file content is saved */
    onContentSaved?: (itemId: string, content: string) => void;
    /** If true, opens the file in fullscreen mode */
    openInFullscreen?: boolean;
    /** Callback invoked when fullscreen mode has been opened */
    onFullscreenOpened?: () => void;
    /** Callback to return to master list on mobile */
    onBackToMaster?: () => void;
    /** If true, skip subscription checks and use local save callback (deprecated - use DataServiceProvider instead) */
    isDemo?: boolean;
}

/**
 * Right-side detail panel that shows:
 * - Folder information when a folder is selected
 * - Rich text editor when a file is selected
 * - Empty state when nothing is selected
 */
export function DetailPanel({ selectedItem, projectId, onContentSaved, openInFullscreen, onFullscreenOpened, onBackToMaster, isDemo: isDemoProp = false }: DetailPanelProps) {
    const dataService = useDataServiceOptional();
    // Use DataService.isDemo if available, otherwise fall back to prop
    const isDemo = dataService?.isDemo ?? isDemoProp;
    const [content, setContent] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showCanvasUnavailable, setShowCanvasUnavailable] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedContent = useRef('');
    const selectedItemIdRef = useRef<string | null>(null);

    const { isPro, percentage, isAtLimit, refresh: refreshSubscription } = useSubscription();
    const { fontSize, lineHeight, textColor } = usePreferences();

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Track if component is mounted (for portal)
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Check if we should show the 80% warning (once per day)
    useEffect(() => {
        if (isPro || percentage < 80 || percentage >= 100) {
            setShowUpgradeBanner(false);
            return;
        }

        const lastShown = localStorage.getItem('upgradeWarningLastShown');
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000;

        if (!lastShown || now - parseInt(lastShown) > oneDay) {
            setShowUpgradeBanner(true);
        }
    }, [isPro, percentage]);

    const handleDismissUpgradeBanner = useCallback(() => {
        setShowUpgradeBanner(false);
        localStorage.setItem('upgradeWarningLastShown', new Date().getTime().toString());
    }, []);

    const handleLimitBlocked = useCallback(() => {
        setShowLimitModal(true);
    }, []);

    // Load content when a file or canvas is selected
    useEffect(() => {
        if (selectedItem?.type === 'file' || selectedItem?.type === 'canvas') {
            // Only reset content if we're switching to a different item
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
        if (openInFullscreen && (selectedItem?.type === 'file')) {
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
    const saveContent = useCallback(async (newContent: string, skipGoalTracking: boolean = false) => {
        if (!selectedItem || (selectedItem.type !== 'file' && selectedItem.type !== 'canvas')) return;
        if (newContent === lastSavedContent.current) return;

        setSaveStatus('saving');
        setError(null);

        // Calculate words for goal tracking (only for files)
        const countWords = (html: string) => {
            const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            return text ? text.split(/\s+/).filter(Boolean).length : 0;
        };

        const previousWordCount = countWords(lastSavedContent.current);
        const newWordCount = countWords(newContent);
        const wordsAdded = Math.max(0, newWordCount - previousWordCount);

        // Use DataService if available, otherwise use callback for demo
        if (dataService) {
            const result = await dataService.updateContent(selectedItem.id, newContent);

            if (result.success) {
                lastSavedContent.current = newContent;
                setSaveStatus('saved');
                onContentSaved?.(selectedItem.id, newContent);

                // Track goal progress (only for files with positive word additions, skip if restoring, skip in demo)
                if (!isDemo && !skipGoalTracking && selectedItem.type === 'file' && projectId && wordsAdded > 0) {
                    goalService.addWords(projectId, wordsAdded)
                        .then(() => {
                            window.dispatchEvent(new CustomEvent('goalProgressUpdated', {
                                detail: { wordsAdded }
                            }));
                        })
                        .catch(err => {
                            console.error('Failed to track goal progress:', err);
                        });
                }

                // Refresh subscription word count after save (only for files, not in demo)
                if (!isDemo && selectedItem.type === 'file') {
                    refreshSubscription();
                }

                setTimeout(() => {
                    setSaveStatus('idle');
                }, 2000);
            } else {
                setError('error' in result ? result.error : 'Failed to save');
                setSaveStatus('error');
            }
        } else {
            // Fallback for demo without DataService (shouldn't happen with proper setup)
            lastSavedContent.current = newContent;
            setSaveStatus('saved');
            onContentSaved?.(selectedItem.id, newContent);
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        }
    }, [selectedItem, projectId, onContentSaved, refreshSubscription, isDemo, dataService]);

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
            // If entering focus mode and not in fullscreen, also enter fullscreen
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
                        <Lightbulb size={24} strokeWidth={1.5} className={styles.tipIcon} />
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
                        <Lightbulb size={24} strokeWidth={1.5} className={styles.tipIcon} />
                        <p className={styles.tipText}>
                            Hover over items in the sidebar to reveal buttons for renaming, deleting, or adding subfolders.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Canvas view - mindmap editor
    if (selectedItem.type === 'canvas') {
        // On mobile, show "coming soon" message instead of canvas
        if (isMobile) {
            return (
                <div className={styles.panel}>
                    <button
                        onClick={onBackToMaster}
                        className={styles.mobileBackButton}
                        aria-label="Back to files"
                    >
                        <X size={20} strokeWidth={1.5} />
                    </button>
                    <div className={styles.canvasUnavailable}>
                        <div className={styles.canvasUnavailableIcon}>🎨</div>
                        <h3 className={styles.canvasUnavailableTitle}>Canvas Editor</h3>
                        <p className={styles.canvasUnavailableText}>
                            The canvas editor will be available in the app version. Stay tuned!
                        </p>
                        <button
                            onClick={onBackToMaster}
                            className={styles.canvasUnavailableButton}
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            );
        }

        const handleCanvasChange = (newContent: string) => {
            setContent(newContent);

            // Clear existing timeout
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            // Set new timeout for auto-save
            saveTimeoutRef.current = setTimeout(() => {
                saveContent(newContent);
            }, 1500);
        };

        const canvasContent = (
            <div className={styles.canvasView}>
                <div className={styles.canvasHeader}>
                    <h2 className={styles.fileName}>
                        {selectedItem.name.length > 25
                            ? selectedItem.name.slice(0, 25) + '...'
                            : selectedItem.name}
                    </h2>
                    <div className={styles.canvasHeaderRight}>
                        <IconButton
                            onClick={() => saveContent(content)}
                            className={content === lastSavedContent.current ? styles.saved : styles.unsaved}
                            disabled={saveStatus === 'saving' || content === lastSavedContent.current}
                            title={content === lastSavedContent.current ? 'All changes saved' : 'Save now'}
                        >
                            {content === lastSavedContent.current ? (
                                <Check size={16} strokeWidth={2} />
                            ) : (
                                <div className={styles.unsavedDot} />
                            )}
                        </IconButton>
                        <IconButton
                            onClick={() => setShowVersionHistory(true)}
                            title="Version history"
                        >
                            <History size={16} strokeWidth={1.5} />
                        </IconButton>
                        <IconButton
                            onClick={onBackToMaster}
                            className={styles.mobileCloseButton}
                            title="Back to files"
                        >
                            <X size={18} strokeWidth={1.5} />
                        </IconButton>
                        {!isMobile && (
                            <IconButton
                                onClick={toggleFullscreen}
                                title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
                            >
                                {isFullscreen ? <Minimize2 size={18} strokeWidth={1.5} /> : <Maximize2 size={18} strokeWidth={1.5} />}
                            </IconButton>
                        )}
                    </div>
                </div>
                {error && (
                    <div className={styles.errorBanner}>
                        <span><AlertTriangle size={16} strokeWidth={1.5} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {error}</span>
                    </div>
                )}
                <div className={styles.canvasContainer}>
                    <CanvasEditor
                        content={content}
                        onContentChange={handleCanvasChange}
                    />
                </div>
            </div>
        );

        if (isFullscreen) {
            return (
                <>
                    <div className={styles.fullscreenOverlay}>
                        <div className={styles.fullscreenEditor}>
                            {canvasContent}
                        </div>
                    </div>
                    {isMounted && showVersionHistory && createPortal(
                        <VersionHistory
                            itemId={selectedItem.id}
                            itemName={selectedItem.name}
                            currentContent={content}
                            onRestore={(restoredContent) => {
                                setContent(restoredContent);
                                saveContent(restoredContent, true); // Skip goal tracking for restores
                            }}
                            onClose={() => setShowVersionHistory(false)}
                            isDemo={isDemo}
                        />,
                        document.body
                    )}
                </>
            );
        }

        return (
            <>
                <div className={styles.panel}>
                    {canvasContent}
                </div>
                {isMounted && showVersionHistory && createPortal(
                    <VersionHistory
                        itemId={selectedItem.id}
                        itemName={selectedItem.name}
                        currentContent={content}
                        onRestore={(restoredContent) => {
                            setContent(restoredContent);
                            saveContent(restoredContent, true); // Skip goal tracking for restores
                        }}
                        onClose={() => setShowVersionHistory(false)}
                        isDemo={isDemo}
                    />,
                    document.body
                )}
            </>
        );
    }

    // File view - rich text editor
    // Calculate statistics - strip HTML tags before counting words
    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const plainText = stripHtml(content);
    const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
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
                    <IconButton
                        onClick={() => saveContent(content)}
                        className={content === lastSavedContent.current ? styles.saved : styles.unsaved}
                        disabled={saveStatus === 'saving' || content === lastSavedContent.current}
                        title={content === lastSavedContent.current ? 'All changes saved' : 'Save now (Ctrl+S)'}
                    >
                        {content === lastSavedContent.current ? (
                            <Check size={16} strokeWidth={2} />
                        ) : (
                            <div className={styles.unsavedDot} />
                        )}
                    </IconButton>
                    <IconButton
                        onClick={() => setShowVersionHistory(true)}
                        title="Version history"
                    >
                        <History size={16} strokeWidth={1.5} />
                    </IconButton>
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
                    <IconButton
                        onClick={onBackToMaster}
                        className={styles.mobileCloseButton}
                        title="Back to files"
                    >
                        <X size={18} strokeWidth={1.5} />
                    </IconButton>
                    {!isMobile && (
                        <IconButton
                            onClick={toggleFullscreen}
                            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 size={18} strokeWidth={1.5} /> : <Maximize2 size={18} strokeWidth={1.5} />}
                        </IconButton>
                    )}
                </div>
            </div>

            {error && (
                <div className={styles.errorBanner}>
                    <span><AlertTriangle size={16} strokeWidth={1.5} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {error}</span>
                </div>
            )}

            <div className={styles.editorContainer}>
                <TiptapEditor
                    content={content}
                    onContentChange={handleContentChange}
                    placeholder="Start writing your story..."
                    isAtLimit={isDemo ? false : isAtLimit}
                    isPro={isDemo ? true : isPro}
                    onLimitBlocked={handleLimitBlocked}
                    focusMode={isFocusMode}
                    fontSize={fontSize}
                    lineHeight={lineHeight}
                    textColor={textColor}
                />
            </div>

            {/* Focus mode button - only show in fullscreen */}
            {isFullscreen && (
                <button
                    onClick={toggleFocusMode}
                    className={`${styles.focusButton} ${isFocusMode ? styles.focusButtonActive : ''}`}
                    title={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
                >
                    {isFocusMode ? <EyeClosed size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                </button>
            )}

            {/* Show upgrade warning at 80%+ usage - rendered via portal */}
            {isMounted && !isDemo && !isPro && percentage >= 80 && percentage < 100 && showUpgradeBanner && createPortal(
                <UpgradePrompt
                    type="banner"
                    percentage={Math.round(percentage)}
                    onClose={handleDismissUpgradeBanner}
                />,
                document.body
            )}

            {/* Show limit modal when user tries to type at 100% - rendered via portal */}
            {isMounted && !isDemo && showLimitModal && createPortal(
                <UpgradePrompt
                    type="modal"
                    onClose={() => setShowLimitModal(false)}
                />,
                document.body
            )}

            {/* Version History Panel */}
            {isMounted && showVersionHistory && createPortal(
                <VersionHistory
                    itemId={selectedItem.id}
                    itemName={selectedItem.name}
                    currentContent={content}
                    onRestore={(restoredContent) => {
                        setContent(restoredContent);
                        // Trigger save of restored content (skip goal tracking)
                        saveContent(restoredContent, true);
                    }}
                    onClose={() => setShowVersionHistory(false)}
                    isDemo={isDemo}
                />,
                document.body
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


