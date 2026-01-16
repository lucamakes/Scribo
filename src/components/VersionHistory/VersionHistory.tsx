'use client';

import { useState, useEffect, useCallback } from 'react';
import { versionService } from '@/lib/services/versionService';
import type { VersionRow } from '@/types/version';
import { History, X, RotateCcw, Eye, Clock, FileText, Save } from 'lucide-react';
import IconButton from '@/components/IconButton/IconButton';
import Button from '@/components/Button/Button';
import styles from './VersionHistory.module.css';

interface VersionHistoryProps {
  /** Item ID to show versions for */
  itemId: string;
  /** Item name for display */
  itemName: string;
  /** Current content (to compare with versions) */
  currentContent: string;
  /** Called when user wants to restore a version */
  onRestore: (content: string) => void;
  /** Called when panel should close */
  onClose: () => void;
  /** Whether this is demo mode */
  isDemo?: boolean;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Format full date for tooltip
 */
function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Version History panel component.
 * Shows list of saved versions with preview and restore options.
 */
export function VersionHistory({
  itemId,
  itemName,
  currentContent,
  onRestore,
  onClose,
  isDemo = false
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState<VersionRow | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  // Load versions
  const loadVersions = useCallback(async () => {
    if (isDemo) {
      setVersions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await versionService.getVersions(itemId);
    
    if (result.success) {
      setVersions(result.data);
    } else {
      setError((result as { success: false; error: string }).error);
    }
    setLoading(false);
  }, [itemId, isDemo]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  // Handle manual save
  const handleSaveVersion = useCallback(async () => {
    if (isDemo) return;
    
    setSaving(true);
    const result = await versionService.createVersion(itemId, currentContent);
    
    if (result.success && result.data) {
      // Reload versions to show the new one
      await loadVersions();
    }
    setSaving(false);
  }, [itemId, currentContent, isDemo, loadVersions]);

  // Handle restore
  const handleRestore = useCallback(async (version: VersionRow) => {
    setRestoring(true);
    setActiveVersionId(version.id);
    onRestore(version.content);
    setRestoring(false);
    setPreviewVersion(null);
    onClose();
  }, [onRestore, onClose]);

  // Strip HTML for preview
  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  // Get preview text (first 150 chars)
  const getPreviewText = (content: string) => {
    const text = stripHtml(content);
    if (text.length <= 150) return text;
    return text.slice(0, 150) + '...';
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <History size={18} strokeWidth={1.5} />
            <h2 className={styles.title}>Version History</h2>
          </div>
          <div className={styles.headerRight}>
            <Button 
              onClick={handleSaveVersion} 
              disabled={saving || isDemo}
              title="Save current version"
            >
              <Save size={16} strokeWidth={1.5} />
              {saving ? 'Saving...' : 'Save Version'}
            </Button>
            <IconButton onClick={onClose} title="Close" variant="ghost">
              <X size={18} strokeWidth={1.5} />
            </IconButton>
          </div>
        </div>

        <div className={styles.subtitle}>
          <FileText size={14} strokeWidth={1.5} />
          <span>{itemName}</span>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span>Loading versions...</span>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <span>{error}</span>
              <button onClick={loadVersions} className={styles.retryButton}>
                Retry
              </button>
            </div>
          ) : versions.length === 0 ? (
            <div className={styles.empty}>
              <Clock size={32} strokeWidth={1.5} className={styles.emptyIcon} />
              <p className={styles.emptyText}>No versions saved yet</p>
              <p className={styles.emptyHint}>
                Click &quot;Save Version&quot; to create a snapshot
              </p>
            </div>
          ) : (
            <div className={styles.versionList}>
              {versions.map((version, index) => {
                const date = new Date(version.created_at);
                const isLatest = index === 0;
                const isActive = activeVersionId === version.id;
                
                return (
                  <div
                    key={version.id}
                    className={`${styles.versionItem} ${isActive ? styles.currentVersion : ''}`}
                  >
                    <div className={styles.versionHeader}>
                      <div className={styles.versionInfo}>
                        <span className={styles.versionNumber}>
                          Version {version.version_number}
                          {isActive && <span className={styles.currentBadge}>Active</span>}
                          {isLatest && !isActive && <span className={styles.latestBadge}>Latest</span>}
                        </span>
                        <span 
                          className={styles.versionTime}
                          title={formatFullDate(date)}
                        >
                          {formatTimeAgo(date)}
                        </span>
                      </div>
                      <span className={styles.wordCount}>
                        {version.word_count.toLocaleString()} words
                      </span>
                    </div>
                    
                    <p className={styles.versionPreview}>
                      {getPreviewText(version.content) || <em>Empty document</em>}
                    </p>
                    
                    <div className={styles.versionActions}>
                      <button
                        onClick={() => setPreviewVersion(version)}
                        className={styles.previewButton}
                        title="Preview this version"
                      >
                        <Eye size={14} strokeWidth={1.5} />
                        Preview
                      </button>
                      <button
                        onClick={() => handleRestore(version)}
                        className={styles.restoreButton}
                        disabled={restoring || isActive}
                        title={isActive ? "Currently active" : "Restore this version"}
                      >
                        <RotateCcw size={14} strokeWidth={1.5} />
                        {isActive ? 'Active' : 'Restore'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {previewVersion && (
          <div className={styles.previewOverlay} onClick={() => setPreviewVersion(null)}>
            <div className={styles.previewModal} onClick={e => e.stopPropagation()}>
              <div className={styles.previewHeader}>
                <h3>Version {previewVersion.version_number} Preview</h3>
                <IconButton onClick={() => setPreviewVersion(null)} title="Close" variant="ghost">
                  <X size={18} strokeWidth={1.5} />
                </IconButton>
              </div>
              <div 
                className={styles.previewContent}
                dangerouslySetInnerHTML={{ __html: previewVersion.content }}
              />
              <div className={styles.previewFooter}>
                <span className={styles.previewMeta}>
                  {previewVersion.word_count.toLocaleString()} words • {formatFullDate(new Date(previewVersion.created_at))}
                </span>
                <Button onClick={() => handleRestore(previewVersion)} disabled={restoring}>
                  <RotateCcw size={14} strokeWidth={1.5} />
                  Restore this version
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
