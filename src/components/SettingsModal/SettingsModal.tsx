'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Type, AlignLeft, Palette, Trash2, Download } from 'lucide-react';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { useAuth } from '@/lib/context/AuthContext';
import { useSubscription } from '@/lib/hooks/useSubscription';
import IconButton from '@/components/IconButton/IconButton';
import Button from '@/components/Button/Button';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoExport?: {
    enabled: boolean;
    intervalMinutes: number;
    setEnabled: (enabled: boolean) => void;
    setIntervalMinutes: (minutes: number) => void;
    exportNow: () => void;
  };
}

/**
 * Settings modal for user preferences.
 * Includes font size, line height, and text color settings.
 */
export function SettingsModal({ isOpen, onClose, autoExport }: SettingsModalProps) {
  const router = useRouter();
  const { deleteAccount } = useAuth();
  const { isPro } = useSubscription();
  const { fontSize, lineHeight, textColor, setFontSize, setLineHeight, setTextColor, isLoading } = usePreferences();
  
  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localLineHeight, setLocalLineHeight] = useState(lineHeight);
  const [localTextColor, setLocalTextColor] = useState(textColor);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Sync local state when preferences load
  useEffect(() => {
    setLocalFontSize(fontSize);
    setLocalLineHeight(lineHeight);
    setLocalTextColor(textColor);
  }, [fontSize, lineHeight, textColor]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    await setFontSize(localFontSize);
    await setLineHeight(localLineHeight);
    await setTextColor(localTextColor);
    setSaving(false);
    onClose();
  };

  const handleReset = () => {
    setLocalFontSize(18);
    setLocalLineHeight(2.0);
    setLocalTextColor('#4a4a4a');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    setDeleting(true);
    setDeleteError('');

    const { error } = await deleteAccount();

    if (error) {
      setDeleteError(error);
      setDeleting(false);
      return;
    }

    // Redirect to home after deletion
    router.push('/');
  };

  const colorPresets = [
    { color: '#1a1a1a', name: 'Dark' },
    { color: '#4a4a4a', name: 'Default' },
    { color: '#666666', name: 'Gray' },
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Settings</h2>
          <IconButton onClick={onClose} title="Close">
            <X size={18} strokeWidth={1.5} />
          </IconButton>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>Loading preferences...</div>
          ) : (
            <>
              {/* Font Size */}
              <div className={styles.setting}>
                <div className={styles.settingHeader}>
                  <Type size={18} strokeWidth={1.5} />
                  <label className={styles.settingLabel}>Font Size</label>
                </div>
                <div className={styles.settingControl}>
                  <input
                    type="range"
                    min="14"
                    max="24"
                    value={localFontSize}
                    onChange={(e) => setLocalFontSize(Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.value}>{localFontSize}px</span>
                </div>
              </div>

              {/* Line Height */}
              <div className={styles.setting}>
                <div className={styles.settingHeader}>
                  <AlignLeft size={18} strokeWidth={1.5} />
                  <label className={styles.settingLabel}>Line Height</label>
                </div>
                <div className={styles.settingControl}>
                  <input
                    type="range"
                    min="1.4"
                    max="2.5"
                    step="0.1"
                    value={localLineHeight}
                    onChange={(e) => setLocalLineHeight(Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.value}>{localLineHeight.toFixed(1)}</span>
                </div>
              </div>

              {/* Text Color */}
              <div className={styles.setting}>
                <div className={styles.settingHeader}>
                  <Palette size={18} strokeWidth={1.5} />
                  <label className={styles.settingLabel}>Text Color</label>
                </div>
                <div className={styles.colorPresets}>
                  {colorPresets.map(preset => (
                    <button
                      key={preset.color}
                      onClick={() => setLocalTextColor(preset.color)}
                      className={`${styles.colorButton} ${localTextColor === preset.color ? styles.colorButtonActive : ''}`}
                      style={{ backgroundColor: preset.color }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className={styles.preview}>
                <div className={styles.previewLabel}>Preview</div>
                <p
                  className={styles.previewText}
                  style={{
                    fontSize: `${localFontSize}px`,
                    lineHeight: localLineHeight,
                    color: localTextColor,
                  }}
                >
                  The quick brown fox jumps over the lazy dog. This is how your text will appear in the editor.
                </p>
              </div>

              {/* Auto Export */}
              {autoExport && (
                <div className={styles.setting}>
                  <div className={styles.settingHeader}>
                    <Download size={18} strokeWidth={1.5} />
                    <label className={styles.settingLabel}>Auto Export Backup</label>
                  </div>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleDescription}>
                      Automatically download a backup of your project at a set interval
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoExport.enabled}
                      onClick={() => autoExport.setEnabled(!autoExport.enabled)}
                      className={`${styles.toggle} ${autoExport.enabled ? styles.toggleOn : ''}`}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                  </div>
                  {autoExport.enabled && (
                    <div className={styles.settingControl}>
                      <label className={styles.intervalLabel}>Every</label>
                      <select
                        value={autoExport.intervalMinutes}
                        onChange={(e) => autoExport.setIntervalMinutes(Number(e.target.value))}
                        className={styles.intervalSelect}
                      >
                        <option value={1}>1 minute</option>
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                      </select>
                      <button
                        onClick={autoExport.exportNow}
                        className={styles.exportNowButton}
                      >
                        Export Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Danger Zone */}
              <div className={styles.dangerZone}>
                <div className={styles.dangerHeader}>
                  <Trash2 size={18} strokeWidth={1.5} />
                  <span>Danger Zone</span>
                </div>
                {!showDeleteConfirm ? (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)} 
                    className={styles.deleteButton}
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className={styles.deleteConfirm}>
                    <p className={styles.deleteWarning}>
                      This will permanently delete your account and all your projects. This action cannot be undone.
                      {isPro && (
                        <> Your Pro subscription will be cancelled immediately and you will not receive a refund for any remaining time.</>
                      )}
                    </p>
                    {deleteError && (
                      <p className={styles.deleteError}>{deleteError}</p>
                    )}
                    <input
                      type="text"
                      placeholder='Type "DELETE" to confirm'
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className={styles.deleteInput}
                      disabled={deleting}
                    />
                    <div className={styles.deleteActions}>
                      <button 
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                          setDeleteError('');
                        }} 
                        className={styles.cancelDeleteButton}
                        disabled={deleting}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleDeleteAccount} 
                        className={styles.confirmDeleteButton}
                        disabled={deleteConfirmText !== 'DELETE' || deleting}
                      >
                        {deleting ? 'Deleting...' : 'Delete Forever'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <Button onClick={handleReset} variant="secondary">
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
