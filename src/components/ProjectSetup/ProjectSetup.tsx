'use client';

import { useState, useCallback, type FormEvent, type ChangeEvent } from 'react';
import type { Project } from '@/types/project';
import { useAuth } from '@/lib/context/AuthContext';
import { projectService } from '@/lib/services/projectService';
import styles from './ProjectSetup.module.css';

interface ProjectSetupProps {
  onCreateProject: (project: Project) => void;
}

/**
 * Project creation screen component.
 * Creates project in Supabase and passes it to parent.
 */
export function ProjectSetup({ onCreateProject }: ProjectSetupProps) {
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setProjectName(e.target.value);
    if (error) setError('');
  }, [error]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('Please wait for authentication...');
      return;
    }

    const trimmedName = projectName.trim();
    if (!trimmedName) {
      setError('Project name is required');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Project name must be at least 2 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await projectService.create({
        user_id: user.id,
        name: trimmedName,
      });

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const project: Project = {
        id: result.data.id,
        name: result.data.name,
        createdAt: result.data.created_at,
      };

      onCreateProject(project);
    } catch (err) {
      setError('Failed to create project. Please try again.');
      console.error('Create project error:', err);
      setLoading(false);
    }
  }, [projectName, user, onCreateProject]);

  if (authLoading) {
    return (
      <main className={styles.container}>
        <div className={styles.card}>
          <p className={styles.loading}>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Create New Project</h1>
          <p className={styles.subtitle}>
            Enter a name for your project. This will become your root folder.
          </p>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="projectName" className={styles.label}>
              Project Name
            </label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              onChange={handleChange}
              placeholder="My Project"
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              autoFocus
              autoComplete="off"
              disabled={loading || !user}
            />
            {error && <span className={styles.error}>{error}</span>}
          </div>

          <button type="submit" className={styles.button} disabled={loading || !user}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </main>
  );
}
