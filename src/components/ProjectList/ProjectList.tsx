'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProjectRow } from '@/types/database';
import { projectService } from '@/lib/services/projectService';
import { itemService } from '@/lib/services/itemService';
import { ProjectSetup } from '@/components/ProjectSetup/ProjectSetup';
import { ProjectImportModal } from '@/components/ProjectImportModal';
import { UserMenu } from '@/components/UserMenu/UserMenu';
import { Pencil, X, Plus, ChevronRight, Upload } from 'lucide-react';
import styles from './ProjectList.module.css';

interface ProjectListProps {
  onSelectProject: (project: { id: string; name: string; createdAt: string }) => void;
}

interface ProjectWithStats extends ProjectRow {
  wordCount: number;
  readingTime: number;
  pageCount: string;
}

/**
 * Project list component showing all user projects.
 * Allows selecting a project or creating a new one.
 */
export function ProjectList({ onSelectProject }: ProjectListProps) {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const calculateStats = (content: string) => {
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const readingTime = Math.ceil(wordCount / 225);
    const pageCount = (wordCount / 250).toFixed(1);
    return { wordCount, readingTime, pageCount };
  };

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await projectService.getAll();

    if (!result.success) {
      setError((result as { success: false; error: string }).error);
      setLoading(false);
      return;
    }

    // Load items for each project to calculate stats
    const projectsWithStats = await Promise.all(
      result.data.map(async (project) => {
        const itemsResult = await itemService.getByProject(project.id);
        let totalWords = 0;

        if (itemsResult.success) {
          totalWords = itemsResult.data.reduce((sum, item) => {
            if (item.type === 'file' && item.content) {
              // Strip HTML tags before counting words
              const plainText = item.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
              const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
              return sum + words;
            }
            return sum;
          }, 0);
        }

        const stats = calculateStats(' '.repeat(totalWords)); // Create string with word count
        return {
          ...project,
          wordCount: totalWords,
          readingTime: Math.ceil(totalWords / 225),
          pageCount: (totalWords / 250).toFixed(1),
        };
      })
    );

    setProjects(projectsWithStats);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = useCallback((project: { id: string; name: string; createdAt: string }) => {
    setShowCreate(false);
    onSelectProject(project);
  }, [onSelectProject]);

  const handleImportProject = useCallback((project: { id: string; name: string; createdAt: string }) => {
    setShowImport(false);
    onSelectProject(project);
  }, [onSelectProject]);

  const handleSelectProject = useCallback((project: ProjectRow) => {
    onSelectProject({
      id: project.id,
      name: project.name,
      createdAt: project.created_at,
    });
  }, [onSelectProject]);

  const handleStartEdit = (e: React.MouseEvent, project: ProjectRow) => {
    e.stopPropagation();
    setEditingId(project.id);
    setEditName(project.name);
  };

  const handleSaveEdit = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!editingId || !editName.trim()) return;

    const result = await projectService.updateName(editingId, editName.trim());
    if (result.success) {
      setProjects(projects.map(p => p.id === editingId ? { ...p, name: editName.trim() } : p));
      setEditingId(null);
      setEditName('');
    } else {
      setError((result as { success: false; error: string }).error); // Show error, maybe add timeout to clear
    }
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(null);
    setEditName('');
  };

  const handleStartDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;

    const result = await projectService.delete(deletingId);
    if (result.success) {
      setProjects(projects.filter(p => p.id !== deletingId));
      setDeletingId(null);
    } else {
      setError((result as { success: false; error: string }).error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <main className={styles.container}>
        <div className={styles.card}>
          <p className={styles.loading}>Loading projects...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <h1 className={styles.title}>Projects</h1>
            <UserMenu />
          </div>
          <p className={styles.subtitle}>Select a project or create a new one</p>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.projects}>
          {projects.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyText}>No projects yet</p>
              <p className={styles.emptySubtext}>Create your first project to get started</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {projects.map(project => (
                <li key={project.id} className={styles.item}>
                  <div
                    onClick={() => handleSelectProject(project)}
                    className={styles.projectButton}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.projectInfo}>
                      {editingId === project.id ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(e);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          onBlur={() => handleCancelEdit()}
                          className={styles.editInput}
                        />
                      ) : (
                        <>
                          <span className={styles.projectName}>{project.name}</span>
                          <div className={styles.projectStats}>
                            <span className={styles.stat}>{project.wordCount.toLocaleString()} words</span>
                          </div>
                        </>
                      )}

                      <span className={styles.projectDate}>
                        Created {formatDate(project.created_at)}
                      </span>
                    </div>

                    <div className={styles.actions}>
                      {editingId === project.id ? (
                        // If editing, we rely on Enter/Blur/Escape usually, or we could add a save button icon.
                        // For simplicity with the input taking full width potentially or focus, we'll stick to keyboard + blur for now
                        // or we can add a small checkmark button.
                        null
                      ) : (
                        <>
                          <button
                            onClick={(e) => handleStartEdit(e, project)}
                            className={styles.actionButton}
                            title="Rename"
                          >
                            <Pencil size={14} strokeWidth={1} />
                          </button>
                          <button
                            onClick={(e) => handleStartDelete(e, project.id)}
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            title="Delete"
                          >
                            <X size={14} strokeWidth={1} />
                          </button>
                        </>
                      )}
                      <ChevronRight size={18} strokeWidth={1} className={styles.arrow} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.buttonGroup}>
          <button
            onClick={() => setShowCreate(true)}
            className={styles.createButton}
          >
            <Plus size={16} strokeWidth={1} style={{ marginRight: '6px' }} /> Create New Project
          </button>
          <button
            onClick={() => setShowImport(true)}
            className={styles.importButton}
          >
            <Upload size={16} strokeWidth={1} style={{ marginRight: '6px' }} /> Import Project
          </button>
        </div>

        <ProjectImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onProjectCreated={handleImportProject}
        />

        {showCreate && <ProjectSetup onCreateProject={handleCreateProject} onClose={() => setShowCreate(false)} />}

        {deletingId && (
          <div className={styles.modalOverlay} onClick={() => setDeletingId(null)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <h3 className={styles.modalTitle}>Delete Project</h3>
              <p className={styles.modalText}>
                Are you sure you want to delete this project? This action cannot be undone and will delete all files and folders inside.
              </p>
              <div className={styles.modalActions}>
                <button
                  onClick={() => setDeletingId(null)}
                  className={`${styles.modalButton} ${styles.cancelButton}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className={`${styles.modalButton} ${styles.confirmDeleteButton}`}
                >
                  Delete Project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}



