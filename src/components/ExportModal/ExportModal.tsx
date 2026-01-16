'use client';

import { useState } from 'react';
import { X, Download, FileText } from 'lucide-react';
import IconButton from '@/components/IconButton/IconButton';
import Button from '@/components/Button/Button';
import styles from './ExportModal.module.css';
import { useDataService } from '@/lib/services/dataService';
import { exportProject, type ExportFormat } from '@/lib/services/exportService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
}

export function ExportModal({ isOpen, onClose, projectName, projectId }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('docx');
  const [includeStructure, setIncludeStructure] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataService = useDataService();

  if (!isOpen) return null;

  const formats: { value: ExportFormat; label: string; description: string }[] = [
    { value: 'docx', label: 'Word Document (.docx)', description: 'Compatible with Microsoft Word' },
    { value: 'pdf', label: 'PDF Document (.pdf)', description: 'Universal format for sharing' },
    { value: 'epub', label: 'EPUB (.epub)', description: 'E-book format for readers' },
    { value: 'txt', label: 'Plain Text (.txt)', description: 'Simple text file' },
    { value: 'md', label: 'Markdown (.md)', description: 'Formatted text with markdown syntax' },
    { value: 'html', label: 'HTML (.html)', description: 'Web page format' },
  ];

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    
    try {
      const result = await dataService.getItems(projectId);
      
      if (!result.success) {
        throw new Error('error' in result ? result.error : 'Failed to fetch project items');
      }

      // Export the project
      await exportProject({
        projectId,
        projectName,
        items: result.data,
        format: selectedFormat,
        includeStructure,
      });
      
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>Export Project</h2>
          <IconButton onClick={onClose} title="Close" variant="ghost">
            <X size={18} strokeWidth={1.5} />
          </IconButton>
        </header>

        <div className={styles.content}>
          <div className={styles.section}>
            <label className={styles.label}>Project</label>
            <div className={styles.projectName}>{projectName}</div>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>Export Format</label>
            <div className={styles.formatList}>
              {formats.map((format) => (
                <button
                  key={format.value}
                  onClick={() => setSelectedFormat(format.value)}
                  className={`${styles.formatOption} ${
                    selectedFormat === format.value ? styles.formatOptionSelected : ''
                  }`}
                >
                  <div className={styles.formatIcon}>
                    <FileText size={20} strokeWidth={1.5} />
                  </div>
                  <div className={styles.formatInfo}>
                    <div className={styles.formatLabel}>{format.label}</div>
                    <div className={styles.formatDescription}>{format.description}</div>
                  </div>
                  <div className={styles.radioButton}>
                    {selectedFormat === format.value && <div className={styles.radioButtonInner} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={includeStructure}
                onChange={(e) => setIncludeStructure(e.target.checked)}
                className={styles.checkbox}
              />
              <span>Include folder structure as headings</span>
            </label>
            <p className={styles.hint}>
              When enabled, folder names will be added as section headings in the exported document
            </p>
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          <Button onClick={onClose} variant="secondary" disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            <Download size={16} strokeWidth={1.5} />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </footer>
      </div>
    </div>
  );
}
