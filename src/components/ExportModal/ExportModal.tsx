'use client';

import { useState } from 'react';
import { X, Download } from 'lucide-react';
import IconButton from '@/components/IconButton/IconButton';
import Button from '@/components/Button/Button';
import styles from './ExportModal.module.css';
import { useDataService } from '@/lib/services/dataService';
import { exportProject } from '@/lib/services/exportService';
import { supabase } from '@/lib/supabase';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
}

export function ExportModal({ isOpen, onClose, projectName, projectId }: ExportModalProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataService = useDataService();

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    
    try {
      // Fetch project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        throw new Error('Failed to fetch project details');
      }

      // Fetch all items
      const itemsResult = await dataService.getItems(projectId);
      
      if (!itemsResult.success) {
        throw new Error('error' in itemsResult ? itemsResult.error : 'Failed to fetch project items');
      }

      // Fetch goal progress (optional)
      const { data: goalProgress } = await (supabase as any)
        .from('project_goal_progress')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: true });

      // Export the project
      exportProject({
        project,
        items: itemsResult.data,
        goalProgress: goalProgress || undefined,
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

          <div className={styles.infoBox}>
            <p>Your project will be exported as a JSON file that includes:</p>
            <ul>
              <li>All files, folders, and canvas items</li>
              <li>Complete folder structure and organization</li>
              <li>All content and formatting</li>
              <li>Project goals and progress (if any)</li>
            </ul>
            <p className={styles.hint}>
              You can import this file later to restore your project exactly as it is now.
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
            {exporting ? 'Exporting...' : 'Export Project'}
          </Button>
        </footer>
      </div>
    </div>
  );
}
