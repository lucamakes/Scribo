'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SidebarItem as SidebarItemData } from '@/types/sidebar';
import { TiptapEditor } from '@/components/TiptapEditor/TiptapEditor';
import {
  Lightbulb,
  Check,
  X,
  Maximize2,
  Minimize2,
  Eye,
  EyeClosed,
  LogIn
} from 'lucide-react';
import styles from '@/components/DetailPanel/DetailPanel.module.css';

interface DemoDetailPanelProps {
  selectedItem: SidebarItemData | null;
  onContentSaved?: (itemId: string, content: string) => void;
  openInFullscreen?: boolean;
  onFullscreenOpened?: () => void;
  onBackToMaster?: () => void;
}

export function DemoDetailPanel({ 
  selectedItem, 
  onContentSaved, 
  openInFullscreen, 
  onFullscreenOpened, 
  onBackToMaster 
}: DemoDetailPanelProps) {
  const [content, setContent] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const lastSavedContent = useRef('');
  const selectedItemIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load content when file is selected
  useEffect(() => {
    if (selectedItem?.type === 'file') {
      if (selectedItemIdRef.current !== selectedItem.id) {
        setContent(selectedItem.content || '');
        lastSavedContent.current = selectedItem.content || '';
        selectedItemIdRef.current = selectedItem.id;
      }
    } else {
      selectedItemIdRef.current = null;
    }
  }, [selectedItem]);

  // Handle fullscreen request
  useEffect(() => {
    if (openInFullscreen && selectedItem?.type === 'file') {
      setIsFullscreen(true);
      onFullscreenOpened?.();
    }
  }, [openInFullscreen, selectedItem, onFullscreenOpened]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isFullscreen || isFocusMode)) {
        setIsFocusMode(false);
        setIsFullscreen(false);
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

  // Save content (localStorage via context)
  const saveContent = useCallback((newContent: string) => {
    if (!selectedItem || selectedItem.type !== 'file') return;
    if (newContent === lastSavedContent.current) return;

    lastSavedContent.current = newContent;
    onContentSaved?.(selectedItem.id, newContent);
  }, [selectedItem, onContentSaved]);

  // Debounced content change
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveContent(newContent);
    }, 1000);
  }, [saveContent]);

  const toggleFullscreen = useCallback(() => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    if (!newFullscreenState && window.innerWidth <= 768) {
      onBackToMaster?.();
    }
  }, [isFullscreen, onBackToMaster]);

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode(prev => {
      const newFocusMode = !prev;
      if (newFocusMode && !isFullscreen) {
        setIsFullscreen(true);
      }
      return newFocusMode;
    });
  }, [isFullscreen]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Empty state
  if (!selectedItem) {
    return (
      <div className={styles.panel}>
        <div className={styles.emptyStateWrapper}>
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>Welcome to Scribe</h3>
            <p className={styles.emptyDescription}>
              Select a file from the sidebar to start writing, or create a new one.
            </p>
          </div>
          <div className={styles.tipCard}>
            <Lightbulb size={24} strokeWidth={1} className={styles.tipIcon} />
            <p className={styles.tipText}>
              This is a demo. Your work is saved locally in your browser. Sign up to save to the cloud!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Folder view
  if (selectedItem.type === 'folder') {
    return (
      <div className={styles.panel}>
        <button onClick={onBackToMaster} className={styles.mobileBackButton} aria-label="Back to files">
          <X size={20} strokeWidth={1.5} />
        </button>
        <div className={styles.folderView}>
          <div className={styles.folderHeader}>
            <h2 className={styles.folderName}>{selectedItem.name}</h2>
          </div>
          <div className={styles.tipCard}>
            <Lightbulb size={24} strokeWidth={1} className={styles.tipIcon} />
            <p className={styles.tipText}>
              Hover over items in the sidebar to add files or subfolders.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // File view
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const plainText = stripHtml(content);
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const readingTime = Math.ceil(wordCount / 225);
  const pageCount = (wordCount / 250).toFixed(1);

  const editorContent = (
    <>
      <div className={`${styles.fileHeader} ${isFocusMode ? styles.fileHeaderHidden : ''}`}>
        <div className={styles.fileHeaderLeft}>
          <h2 className={styles.fileName}>
            {selectedItem.name.length > 25 ? selectedItem.name.slice(0, 25) + '...' : selectedItem.name}
          </h2>
        </div>
        <div className={styles.fileHeaderRight}>
          <button
            onClick={() => saveContent(content)}
            className={`${styles.saveButton} ${content === lastSavedContent.current ? styles.saved : styles.unsaved}`}
            disabled={content === lastSavedContent.current}
            title={content === lastSavedContent.current ? 'All changes saved' : 'Save now'}
          >
            {content === lastSavedContent.current ? (
              <Check size={16} strokeWidth={2} />
            ) : (
              <div className={styles.unsavedDot} />
            )}
          </button>
          <div className={styles.statistics}>
            <span className={styles.stat}>{wordCount.toLocaleString()} words</span>
            <span className={styles.statDivider}>•</span>
            <span className={styles.stat}>{readingTime} min read</span>
            <span className={styles.statDivider}>•</span>
            <span className={styles.stat}>{pageCount} pages</span>
          </div>
          <button onClick={onBackToMaster} className={styles.mobileCloseButton} title="Back to files">
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

      <div className={styles.editorContainer}>
        <TiptapEditor
          content={content}
          onContentChange={handleContentChange}
          placeholder="Start writing your story..."
          isAtLimit={false}
          isPro={true}
          onLimitBlocked={() => {}}
          focusMode={isFocusMode}
        />
      </div>

      {isFullscreen && (
        <button
          onClick={toggleFocusMode}
          className={`${styles.focusButton} ${isFocusMode ? styles.focusButtonActive : ''}`}
          title={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
        >
          {isFocusMode ? <EyeClosed size={18} strokeWidth={1} /> : <Eye size={18} strokeWidth={1} />}
        </button>
      )}
    </>
  );

  if (isFullscreen) {
    return (
      <div className={styles.fullscreenOverlay}>
        <div className={styles.fullscreenEditor}>
          {editorContent}
        </div>
      </div>
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
