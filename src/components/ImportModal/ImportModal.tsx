'use client';

import { useState, useCallback, useRef } from 'react';
import { X, Upload, FileJson } from 'lucide-react';
import IconButton from '@/components/IconButton/IconButton';
import Button from '@/components/Button/Button';
import { parseProjectImport } from '@/lib/services/exportService';
import { projectService } from '@/lib/services/projectService';
import { itemService } from '@/lib/services/itemService';
import { supabase } from '@/lib/supabase';
import styles from './ImportModal.module.css';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: { id: string; name: string; createdAt: string }) => void;
}

export function ImportModal({ isOpen, onClose, onProjectCreated }: ImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<any>(null);
  const [projectName, setProjectName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setIsDragging(false);
    setImporting(false);
    setError(null);
    setProjectData(null);
    setProjectName('');
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.json') && !file.name.endsWith('.scribo.json')) {
      setError('Please select a valid Scribo project file (.scribo.json)');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const content = await readFileContent(file);
      const data = parseProjectImport(content);
      
      setProjectData(data);
      setProjectName(data.project.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read project file');
    } finally {
      setImporting(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleImport = async () => {
    if (!projectData || !projectName.trim()) return;

    setImporting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to import a project');
        return;
      }

      // Create the project
      const projectResult = await projectService.create({
        user_id: user.id,
        name: projectName.trim(),
        word_count_goal: projectData.project.word_count_goal,
        time_goal_minutes: projectData.project.time_goal_minutes,
        goal_period: projectData.project.goal_period,
      });

      if (!projectResult.success) {
        setError((projectResult as { success: false; error: string }).error);
        return;
      }

      const project = projectResult.data;

      // Create a mapping of old IDs to new IDs
      const idMap = new Map<string, string>();

      // Create all items
      for (const item of projectData.items) {
        const itemResult = await itemService.create(
          project.id,
          item.parent_id ? idMap.get(item.parent_id) || null : null,
          item.name,
          item.type
        );

        if (itemResult.success) {
          idMap.set(item.id, itemResult.data.id);
          
          // Update content if exists
          if (item.content) {
            await itemService.updateContent(itemResult.data.id, item.content);
          }
        }
      }

      // Import goal progress if exists
      if (projectData.goalProgress && projectData.goalProgress.length > 0) {
        for (const gp of projectData.goalProgress) {
          await (supabase as any).from('project_goal_progress').insert({
            project_id: project.id,
            date: gp.date,
            words_written: gp.words_written,
            time_spent_minutes: gp.time_spent_minutes,
          });
        }
      }

      onProjectCreated({
        id: project.id,
        name: project.name,
        createdAt: project.created_at,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import project');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>Import Project</h2>
          <IconButton onClick={handleClose} title="Close" variant="ghost">
            <X size={18} strokeWidth={1.5} />
          </IconButton>
        </header>

        <div className={styles.content}>
          {!projectData ? (
            <>
              <div
                className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileJson size={48} strokeWidth={1.5} className={styles.uploadIcon} />
                <p className={styles.dropText}>
                  {importing ? 'Reading file...' : 'Drag & drop your project file here'}
                </p>
                <p className={styles.dropSubtext}>or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.scribo.json"
                  onChange={handleFileSelect}
                  className={styles.fileInput}
                />
              </div>

              <div className={styles.infoBox}>
                <p>Import a previously exported Scribo project (.scribo.json file)</p>
                <ul>
                  <li>All files, folders, and canvas items will be restored</li>
                  <li>Complete folder structure preserved</li>
                  <li>Project goals and progress included</li>
                </ul>
              </div>
            </>
          ) : (
            <div className={styles.configureSection}>
              <div className={styles.successBox}>
                <FileJson size={24} strokeWidth={1.5} />
                <div>
                  <div className={styles.successTitle}>Project file loaded</div>
                  <div className={styles.successDesc}>
                    {projectData.items.length} items • Exported {new Date(projectData.exportedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className={styles.input}
                  autoFocus
                />
              </div>

              <button
                onClick={() => setProjectData(null)}
                className={styles.changeFileButton}
              >
                Choose a different file
              </button>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <footer className={styles.footer}>
          <Button onClick={handleClose} variant="secondary" disabled={importing}>
            Cancel
          </Button>
          {projectData && (
            <Button onClick={handleImport} disabled={!projectName.trim() || importing}>
              {importing ? 'Importing...' : 'Import Project'}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
