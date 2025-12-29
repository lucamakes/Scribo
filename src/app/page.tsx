'use client';

import { useState, useCallback } from 'react';
import type { Project } from '@/types/project';
import { ProjectList } from '@/components/ProjectList/ProjectList';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import styles from './page.module.css';

/**
 * Main page with project list and file explorer.
 */
export default function Home() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleSelectProject = useCallback((project: Project) => {
    setSelectedProject(project);
  }, []);

  const handleBackToProjects = useCallback(() => {
    setSelectedProject(null);
  }, []);

  if (!selectedProject) {
    return <ProjectList onSelectProject={handleSelectProject} />;
  }

  return (
    <main className={styles.main}>
      <Sidebar project={selectedProject} />
      <section className={styles.content}>
        <div className={styles.contentHeader}>
          <button onClick={handleBackToProjects} className={styles.backButton}>
            ← Back to Projects
          </button>
        </div>
        <p className={styles.hint}>Drag and drop files and folders in the sidebar</p>
      </section>
    </main>
  );
}
