'use client';

import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Eye, EyeClosed, History, Maximize2, Minimize2, X } from 'lucide-react';
import type { SidebarItem } from '@/types/sidebar';
import { TiptapEditor } from '@/components/TiptapEditor/TiptapEditor';
import { UpgradePrompt } from '@/components/UpgradePrompt/UpgradePrompt';
import { VersionHistory } from '@/components/VersionHistory/VersionHistory';
import IconButton from '@/components/IconButton/IconButton';
import { countWordsInHtml } from '@/lib/editor/wordCount';
import styles from '../DetailPanel.module.css';
import local from './FileView.module.css';

interface FileViewProps {
    item: SidebarItem;
    content: string;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    error: string | null;
    isSaved: boolean;
    isFullscreen: boolean;
    isFocusMode: boolean;
    isMobile: boolean;
    isMounted: boolean;
    isDemo: boolean;
    isPro: boolean;
    isAtLimit: boolean;
    percentage: number;
    showUpgradeBanner: boolean;
    showLimitModal: boolean;
    showVersionHistory: boolean;
    fontSize: number;
    lineHeight: number;
    textColor: string;
    onContentChange: (content: string) => void;
    onPasteWords: (pastedWordCount: number) => void;
    onSave: () => void;
    onRestore: (content: string) => void;
    onToggleVersionHistory: () => void;
    onCloseVersionHistory: () => void;
    onToggleFullscreen: () => void;
    onToggleFocusMode: () => void;
    onLimitBlocked: () => void;
    onDismissUpgradeBanner: () => void;
    onCloseLimitModal: () => void;
    onBackToMaster?: () => void;
}

function shortName(name: string): string {
    return name.length > 25 ? `${name.slice(0, 25)}...` : name;
}

/**
 * Manuscript editor, word statistics, and the panels that sit over it.
 * The word count ignores markup, so margin notes are not included.
 */
export function FileView(props: FileViewProps) {
    const {
        item,
        content,
        saveStatus,
        error,
        isSaved,
        isFullscreen,
        isFocusMode,
        isMobile,
        isMounted,
        isDemo,
        isPro,
        isAtLimit,
        percentage,
        showUpgradeBanner,
        showLimitModal,
        showVersionHistory,
        fontSize,
        lineHeight,
        textColor,
        onContentChange,
        onPasteWords,
        onSave,
        onRestore,
        onToggleVersionHistory,
        onCloseVersionHistory,
        onToggleFullscreen,
        onToggleFocusMode,
        onLimitBlocked,
        onDismissUpgradeBanner,
        onCloseLimitModal,
        onBackToMaster,
    } = props;

    const wordCount = countWordsInHtml(content);
    const readingTime = Math.ceil(wordCount / 225);
    const pageCount = (wordCount / 250).toFixed(1);

    const editorContent = (
        <>
            <div className={`${styles.fileHeader} ${isFocusMode ? styles.fileHeaderHidden : ''}`}>
                <div className={styles.fileHeaderLeft}>
                    <h2 className={styles.fileName}>{shortName(item.name)}</h2>
                </div>
                <div className={styles.fileHeaderRight}>
                    <IconButton
                        onClick={onSave}
                        className={isSaved ? styles.saved : styles.unsaved}
                        disabled={saveStatus === 'saving' || isSaved}
                        title={isSaved ? 'All changes saved' : 'Save now (Ctrl+S)'}
                    >
                        {isSaved ? <Check size={16} strokeWidth={2} /> : <div className={styles.unsavedDot} />}
                    </IconButton>
                    <IconButton onClick={onToggleVersionHistory} title="Version history">
                        <History size={16} strokeWidth={1.5} />
                    </IconButton>
                    <div className={styles.statistics}>
                        <span className={styles.stat}>{wordCount.toLocaleString()} words</span>
                        <span className={styles.statDivider}>•</span>
                        <span className={styles.stat}>{readingTime} min read</span>
                        <span className={styles.statDivider}>•</span>
                        <span className={styles.stat}>{pageCount} pages</span>
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
                            onClick={onToggleFullscreen}
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
                    onContentChange={onContentChange}
                    placeholder="Start writing your story..."
                    isAtLimit={isDemo ? false : isAtLimit}
                    isPro={isDemo ? true : isPro}
                    onLimitBlocked={onLimitBlocked}
                    onPaste={onPasteWords}
                    focusMode={isFocusMode}
                    fontSize={fontSize}
                    lineHeight={lineHeight}
                    textColor={textColor}
                />
            </div>
            {isFullscreen && (
                <button
                    onClick={onToggleFocusMode}
                    className={`${styles.focusButton} ${isFocusMode ? styles.focusButtonActive : ''}`}
                    title={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
                >
                    {isFocusMode ? <EyeClosed size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                </button>
            )}
            {isMounted && !isDemo && !isPro && percentage >= 80 && percentage < 100 && showUpgradeBanner && createPortal(
                <UpgradePrompt
                    type="banner"
                    percentage={Math.round(percentage)}
                    onClose={onDismissUpgradeBanner}
                />,
                document.body,
            )}
            {isMounted && !isDemo && showLimitModal && createPortal(
                <UpgradePrompt type="modal" onClose={onCloseLimitModal} />,
                document.body,
            )}
            {isMounted && showVersionHistory && createPortal(
                <VersionHistory
                    itemId={item.id}
                    itemName={item.name}
                    currentContent={content}
                    onRestore={onRestore}
                    onClose={onCloseVersionHistory}
                    isDemo={isDemo}
                />,
                document.body,
            )}
        </>
    );

    if (isFullscreen) {
        return (
            <div className={styles.fullscreenOverlay}>
                <div className={`${styles.fullscreenEditor} ${local.root}`}>{editorContent}</div>
            </div>
        );
    }

    return (
        <div className={styles.panel}>
            <div className={`${styles.fileView} ${local.root}`}>{editorContent}</div>
        </div>
    );
}
