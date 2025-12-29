'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProjectRow } from '@/types/database';
import { projectService } from '@/lib/services/projectService';
import { ProjectSetup } from '@/components/ProjectSetup/ProjectSetup';
import styles from './ProjectList.module.css';

interface ProjectListProps {
  onSelectProject: (project: { id: string; name: string; createdAt: string }) => void;
}

/**
 * Project list component showing all user projects.
 * Allows selecting a project or creating a new one.
 */
export function ProjectList({ onSelectProject }: ProjectListProps) {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await projectService.getAll();
    
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setProjects(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = useCallback((project: { id: string; name: string; createdAt: string }) => {
    setShowCreate(false);
    onSelectProject(project);
  }, [onSelectProject]);

  const handleSelectProject = useCallback((project: ProjectRow) => {
    onSelectProject({
      id: project.id,
      name: project.name,
      createdAt: project.created_at,
    });
  }, [onSelectProject]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (showCreate) {
    return <ProjectSetup onCreateProject={handleCreateProject} />;
  }

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
          <h1 className={styles.title}>Projects</h1>
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
                  <button
                    onClick={() => handleSelectProject(project)}
                    className={styles.projectButton}
                  >
                    <div className={styles.projectInfo}>
                      <span className={styles.projectName}>{project.name}</span>
                      <span className={styles.projectDate}>
                        Created {formatDate(project.created_at)}
                      </span>
                    </div>
                    <span className={styles.arrow}>→</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className={styles.createButton}
        >
          + Create New Project
        </button>
      </div>
    </main>
  );
}

