'use client';

import { useState } from 'react';
import { X, Download, FileText, File } from 'lucide-react';
import styles from './ExportModal.module.css';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
}

type ExportFormat = 'docx' | 'pdf' | 'txt' | 'md' | 'html';

export function ExportModal({ isOpen, onClose, projectName, projectId }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('docx');
  const [includeStructure, setIncludeStructure] = useState(true);
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const formats: { value: ExportFormat; label: string; description: string }[] = [
    { value: 'docx', label: 'Word Document (.docx)', description: 'Compatible with Microsoft Word' },
    { value: 'pdf', label: 'PDF Document (.pdf)', description: 'Universal format for sharing' },
    { value: 'txt', label: 'Plain Text (.txt)', description: 'Simple text file' },
    { value: 'md', label: 'Markdown (.md)', description: 'Formatted text with markdown syntax' },
    { value: 'html', label: 'HTML (.html)', description: 'Web page format' },
  ];

  const handleExport = async () => {
    setExporting(true);
    
    try {
      // TODO: Implement actual export logic
      // This would call an API endpoint that:
      // 1. Fetches all items in the project
      // 2. Combines them based on includeStructure setting
      // 3. Converts to the selected format
      // 4. Returns a downloadable file
      
      console.log('Exporting project:', {
        projectId,
        projectName,
        format: selectedFormat,
        includeStructure,
      });

      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For now, just close the modal
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>Export Project</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
          >
            <X size={18} strokeWidth={1} />
          </button>
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
                    <FileText size={20} strokeWidth={1} />
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
        </div>

        <footer className={styles.footer}>
          <button
            onClick={onClose}
            className={styles.cancelButton}
            disabled={exporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className={styles.exportButton}
            disabled={exporting}
          >
            <Download size={16} strokeWidth={1} />
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </footer>
      </div>
    </div>
  );
}
