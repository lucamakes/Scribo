'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import type { SidebarItem as SidebarItemData } from '@/types/sidebar';
import { useDataServiceOptional } from '@/lib/services/dataService';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { useAutosaveContent } from '@/lib/hooks/useAutosaveContent';
import { Lightbulb } from 'lucide-react';
import { FolderView } from './FolderView/FolderView';
import { CanvasView } from './CanvasView/CanvasView';
import { FileView } from './FileView/FileView';
import styles from './DetailPanel.module.css';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function subscribeToResize(onChange: () => void): () => void {
    window.addEventListener('resize', onChange);
    return () => window.removeEventListener('resize', onChange);
}

function readIsMobile(): boolean {
    return window.innerWidth <= 768;
}

function subscribeToNothing(): () => void {
    return () => {};
}

/** True after hydration, so document.body portals are not rendered on the server. */
function useIsMounted(): boolean {
    return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}

function upgradeWarningIsDue(isPro: boolean, percentage: number): boolean {
    if (isPro || percentage < 80 || percentage >= 100) return false;
    if (typeof window === 'undefined') return false;
    const lastShown = localStorage.getItem('upgradeWarningLastShown');
    if (!lastShown) return true;
    const shownAt = Number.parseInt(lastShown, 10);
    if (Number.isNaN(shownAt)) return true;
    return Date.now() - shownAt > ONE_DAY_MS;
}

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
export function DetailPanel({
    selectedItem,
    projectId,
    onContentSaved,
    openInFullscreen,
    onFullscreenOpened,
    onBackToMaster,
    isDemo: isDemoProp = false,
}: DetailPanelProps) {
    const dataService = useDataServiceOptional();
    const isDemo = dataService?.isDemo ?? isDemoProp;
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [upgradeDismissed, setUpgradeDismissed] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [appliedFullscreenId, setAppliedFullscreenId] = useState<string | null>(null);
    const isMobile = useSyncExternalStore(subscribeToResize, readIsMobile, () => false);
    const isMounted = useIsMounted();

    const { isPro, percentage, isAtLimit, refresh: refreshSubscription } = useSubscription();
    const showUpgradeBanner = !upgradeDismissed && upgradeWarningIsDue(isPro, percentage);
    const { fontSize, lineHeight, textColor } = usePreferences();
    const {
        content,
        saveStatus,
        error,
        isSaved,
        handleContentChange,
        handlePasteWords,
        saveNow,
    } = useAutosaveContent({
        selectedItem,
        projectId,
        onContentSaved,
        isDemo,
        refreshSubscription,
    });

    const handleDismissUpgradeBanner = useCallback(() => {
        setUpgradeDismissed(true);
        localStorage.setItem('upgradeWarningLastShown', Date.now().toString());
    }, []);

    const handleLimitBlocked = useCallback(() => {
        setShowLimitModal(true);
    }, []);

    const fullscreenItemId = openInFullscreen && selectedItem?.type === 'file' ? selectedItem.id : null;
    if (fullscreenItemId && fullscreenItemId !== appliedFullscreenId) {
        setAppliedFullscreenId(fullscreenItemId);
        setIsFullscreen(true);
    }

    useEffect(() => {
        if (!fullscreenItemId || fullscreenItemId !== appliedFullscreenId) return;
        onFullscreenOpened?.();
    }, [fullscreenItemId, appliedFullscreenId, onFullscreenOpened]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && (isFullscreen || isFocusMode)) {
                setIsFocusMode(false);
                setIsFullscreen(false);
                if (window.innerWidth <= 768) onBackToMaster?.();
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

    const toggleFullscreen = useCallback(() => {
        const next = !isFullscreen;
        setIsFullscreen(next);
        if (!next && window.innerWidth <= 768) onBackToMaster?.();
    }, [isFullscreen, onBackToMaster]);

    const toggleFocusMode = useCallback(() => {
        setIsFocusMode((previous) => {
            const next = !previous;
            if (next && !isFullscreen) setIsFullscreen(true);
            return next;
        });
    }, [isFullscreen]);

    const restoreContent = useCallback((restoredContent: string) => {
        saveNow(restoredContent, true);
    }, [saveNow]);

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

    if (selectedItem.type === 'folder') {
        return <FolderView item={selectedItem} onBackToMaster={onBackToMaster} />;
    }

    if (selectedItem.type === 'canvas') {
        return (
            <CanvasView
                item={selectedItem}
                content={content}
                saveStatus={saveStatus}
                error={error}
                isSaved={isSaved}
                isFullscreen={isFullscreen}
                isMobile={isMobile}
                isMounted={isMounted}
                showVersionHistory={showVersionHistory}
                isDemo={isDemo}
                onContentChange={handleContentChange}
                onSave={() => saveNow(content)}
                onRestore={restoreContent}
                onToggleVersionHistory={() => setShowVersionHistory(true)}
                onCloseVersionHistory={() => setShowVersionHistory(false)}
                onToggleFullscreen={toggleFullscreen}
                onBackToMaster={onBackToMaster}
            />
        );
    }

    return (
        <FileView
            item={selectedItem}
            content={content}
            saveStatus={saveStatus}
            error={error}
            isSaved={isSaved}
            isFullscreen={isFullscreen}
            isFocusMode={isFocusMode}
            isMobile={isMobile}
            isMounted={isMounted}
            isDemo={isDemo}
            isPro={isPro}
            isAtLimit={isAtLimit}
            percentage={percentage}
            showUpgradeBanner={showUpgradeBanner}
            showLimitModal={showLimitModal}
            showVersionHistory={showVersionHistory}
            fontSize={fontSize}
            lineHeight={lineHeight}
            textColor={textColor}
            onContentChange={handleContentChange}
            onPasteWords={handlePasteWords}
            onSave={() => saveNow(content)}
            onRestore={restoreContent}
            onToggleVersionHistory={() => setShowVersionHistory(true)}
            onCloseVersionHistory={() => setShowVersionHistory(false)}
            onToggleFullscreen={toggleFullscreen}
            onToggleFocusMode={toggleFocusMode}
            onLimitBlocked={handleLimitBlocked}
            onDismissUpgradeBanner={handleDismissUpgradeBanner}
            onCloseLimitModal={() => setShowLimitModal(false)}
            onBackToMaster={onBackToMaster}
        />
    );
}
