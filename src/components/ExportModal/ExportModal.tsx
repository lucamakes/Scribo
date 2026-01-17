'use client';

import { useState } from 'react';
import { X, Download, FileJson, FileType } from 'lucide-react';
import IconButton from '@/components/IconButton/IconButton';
import Button from '@/components/Button/Button';
import styles from './ExportModal.module.css';
import { useDataService } from '@/lib/services/dataService';
import { exportProject, type ExportFormat } from '@/lib/services/exportService';
import type { GoalProgressRow } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
}

export function ExportModal({ isOpen, onClose, projectName, projectId }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataService = useDataService();

  if (!isOpen) return null;

  const formats: { value: ExportFormat; label: string; description: string; icon: typeof FileJson }[] = [
    { value: 'json', label: 'Scribo Project (.scribo.json)', description: 'Complete backup - can be imported back', icon: FileJson },
    { value: 'markdown', label: 'Markdown (.md)', description: 'For any text editor that uses markdown', icon: FileType },
  ];

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    
    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        throw new Error('Failed to fetch project details');
      }

      const itemsResult = await dataService.getItems(projectId);
      
      if (!itemsResult.success) {
        throw new Error('error' in itemsResult ? itemsResult.error : 'Failed to fetch project items');
      }

      let goalProgress: GoalProgressRow[] | undefined;
      if (selectedFormat === 'json') {
        const { data } = await (supabase as any)
          .from('project_goal_progress')
          .select('*')
          .eq('project_id', projectId)
          .order('date', { ascending: true });
        goalProgress = data || undefined;
      }

      exportProject({
        project,
        items: itemsResult.data,
        goalProgress,
        format: selectedFormat,
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
              {formats.map((format) => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.value}
                    onClick={() => setSelectedFormat(format.value)}
                    className={`${styles.formatOption} ${
                      selectedFormat === format.value ? styles.formatOptionSelected : ''
                    }`}
                  >
                    <div className={styles.formatIcon}>
                      <Icon size={20} strokeWidth={1.5} />
                    </div>
                    <div className={styles.formatInfo}>
                      <div className={styles.formatLabel}>{format.label}</div>
                      <div className={styles.formatDescription}>{format.description}</div>
                    </div>
                    <div className={styles.radioButton}>
                      {selectedFormat === format.value && <div className={styles.radioButtonInner} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedFormat === 'json' && (
            <div className={styles.infoBox}>
              <p>Includes all files, folders, canvas items, and project goals.</p>
              <p className={styles.hint}>Can be imported back into Scribo to restore your project.</p>
            </div>
          )}

         
          {error && <div className={styles.error}>{error}</div>}
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
