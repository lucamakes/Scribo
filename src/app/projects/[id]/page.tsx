'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/types/project';
import type { SidebarItem as SidebarItemData } from '@/types/sidebar';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { DetailPanel } from '@/components/DetailPanel/DetailPanel';
import { UserMenu } from '@/components/UserMenu/UserMenu';
import { projectService } from '@/lib/services/projectService';
import styles from './ProjectPage.module.css';

interface ProjectPageProps {
    params: Promise<{ id: string }>;
}

/**
 * Project details page / workspace.
 * Displays sidebar, content area with header and detail panel.
 */
export default function ProjectPage({ params }: ProjectPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [selectedItem, setSelectedItem] = useState<SidebarItemData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load project data
    useEffect(() => {
        const loadProject = async () => {
            setLoading(true);
            const result = await projectService.getById(id);

            if (result.success) {
                setProject({
                    id: result.data.id,
                    name: result.data.name,
                    createdAt: result.data.created_at,
                });
            } else {
                setError(result.error);
            }
            setLoading(false);
        };

        loadProject();
    }, [id]);

    const handleBackToProjects = useCallback(() => {
        router.push('/projects');
    }, [router]);

    const handleSelectItem = useCallback((item: SidebarItemData | null) => {
        setSelectedItem(item);
    }, []);

    const handleContentSaved = useCallback((itemId: string, content: string) => {
        if (selectedItem && selectedItem.id === itemId) {
            setSelectedItem(prev => prev ? { ...prev, content } : null);
        }
    }, [selectedItem]);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Loading project...</p>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className={styles.errorContainer}>
                <h2>Error loading project</h2>
                <p>{error || 'Project not found'}</p>
                <button onClick={handleBackToProjects} className={styles.backButton}>
                    Back to Projects
                </button>
            </div>
        );
    }

    return (
        <main className={styles.main}>
            <Sidebar
                project={project}
                selectedItemId={selectedItem?.id ?? null}
                onSelectItem={handleSelectItem}
            />
            <section className={styles.content}>
                <div className={styles.contentHeader}>
                    <button onClick={handleBackToProjects} className={styles.backButton}>
                        ← Back to Projects
                    </button>
                    <UserMenu />
                </div>
                <DetailPanel
                    selectedItem={selectedItem}
                    onContentSaved={handleContentSaved}
                />
            </section>
        </main>
    );
}
