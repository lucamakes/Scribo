'use client';

import { createPortal } from 'react-dom';
import { AlertTriangle, Check, History, Maximize2, Minimize2, X } from 'lucide-react';
import type { SidebarItem } from '@/types/sidebar';
import { CanvasEditor } from '@/components/CanvasEditor/CanvasEditor';
import { VersionHistory } from '@/components/VersionHistory/VersionHistory';
import IconButton from '@/components/IconButton/IconButton';
import styles from '../DetailPanel.module.css';
import local from './CanvasView.module.css';

interface CanvasViewProps {
    item: SidebarItem;
    content: string;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    error: string | null;
    isSaved: boolean;
    isFullscreen: boolean;
    isMobile: boolean;
    isMounted: boolean;
    showVersionHistory: boolean;
    isDemo: boolean;
    onContentChange: (content: string) => void;
    onSave: () => void;
    onRestore: (content: string) => void;
    onToggleVersionHistory: () => void;
    onCloseVersionHistory: () => void;
    onToggleFullscreen: () => void;
    onBackToMaster?: () => void;
}

function shortName(name: string): string {
    return name.length > 25 ? `${name.slice(0, 25)}...` : name;
}

/**
 * Canvas detail view, including the mobile fallback and version history.
 */
export function CanvasView({
    item,
    content,
    saveStatus,
    error,
    isSaved,
    isFullscreen,
    isMobile,
    isMounted,
    showVersionHistory,
    isDemo,
    onContentChange,
    onSave,
    onRestore,
    onToggleVersionHistory,
    onCloseVersionHistory,
    onToggleFullscreen,
    onBackToMaster,
}: CanvasViewProps) {
    if (isMobile) {
        return (
            <div className={`${styles.panel} ${local.root}`}>
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

    const canvasContent = (
        <div className={`${styles.canvasView} ${local.root}`}>
            <div className={styles.canvasHeader}>
                <h2 className={styles.fileName}>{shortName(item.name)}</h2>
                <div className={styles.canvasHeaderRight}>
                    <IconButton
                        onClick={onSave}
                        className={isSaved ? styles.saved : styles.unsaved}
                        disabled={saveStatus === 'saving' || isSaved}
                        title={isSaved ? 'All changes saved' : 'Save now'}
                    >
                        {isSaved ? <Check size={16} strokeWidth={2} /> : <div className={styles.unsavedDot} />}
                    </IconButton>
                    <IconButton onClick={onToggleVersionHistory} title="Version history">
                        <History size={16} strokeWidth={1.5} />
                    </IconButton>
                    <IconButton
                        onClick={onBackToMaster}
                        className={styles.mobileCloseButton}
                        title="Back to files"
                    >
                        <X size={18} strokeWidth={1.5} />
                    </IconButton>
                    <IconButton
                        onClick={onToggleFullscreen}
                        title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
                    >
                        {isFullscreen ? <Minimize2 size={18} strokeWidth={1.5} /> : <Maximize2 size={18} strokeWidth={1.5} />}
                    </IconButton>
                </div>
            </div>
            {error && (
                <div className={styles.errorBanner}>
                    <span><AlertTriangle size={16} strokeWidth={1.5} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {error}</span>
                </div>
            )}
            <div className={styles.canvasContainer}>
                <CanvasEditor content={content} onContentChange={onContentChange} />
            </div>
        </div>
    );

    const history = isMounted && showVersionHistory && createPortal(
        <VersionHistory
            itemId={item.id}
            itemName={item.name}
            currentContent={content}
            onRestore={onRestore}
            onClose={onCloseVersionHistory}
            isDemo={isDemo}
        />,
        document.body,
    );

    if (isFullscreen) {
        return (
            <>
                <div className={styles.fullscreenOverlay}>
                    <div className={styles.fullscreenEditor}>{canvasContent}</div>
                </div>
                {history}
            </>
        );
    }

    return (
        <>
            <div className={styles.panel}>{canvasContent}</div>
            {history}
        </>
    );
}
