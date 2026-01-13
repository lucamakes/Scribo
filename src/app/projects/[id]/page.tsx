'use client';

import { useState, useEffect, useCallback, use, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/types/project';
import type { SidebarItem as SidebarItemData } from '@/types/sidebar';
import type { ItemRow } from '@/types/database';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { DetailPanel } from '@/components/DetailPanel/DetailPanel';
import { SettingsModal } from '@/components/SettingsModal/SettingsModal';
import Constellation from '@/example-files/Constellation';
import { projectService } from '@/lib/services/projectService';
import { itemService } from '@/lib/services/itemService';
import { itemsToChildData } from '@/lib/utils/sidebarToConstellation';
import IconButton from '@/components/IconButton/IconButton';
import { X, ArrowLeft } from 'lucide-react';
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
    const [showBlankView, setShowBlankView] = useState(false);
    const [items, setItems] = useState<ItemRow[]>([]);
    const [itemsLoading, setItemsLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openInFullscreen, setOpenInFullscreen] = useState(false);
    const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const lastSelectedIdRef = useRef<string | null>(null);

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
                setError((result as { success: false; error: string }).error);
            }
            setLoading(false);
        };

        loadProject();
    }, [id]);

    // Load items for Constellation
    const loadItems = useCallback(async () => {
        if (!project) return;

        setItemsLoading(true);
        const result = await itemService.getByProject(project.id);

        if (result.success) {
            setItems(result.data);
        }
        setItemsLoading(false);
    }, [project]);

    // Initial load and reload when project changes
    useEffect(() => {
        loadItems();
    }, [loadItems]);

    // Reload items when switching to Constellation view to get latest changes
    useEffect(() => {
        if (showBlankView && project) {
            loadItems();
        }
    }, [showBlankView, project, loadItems]);

    // Convert items to Constellation format
    const constellationData = useMemo(() => {
        return itemsToChildData(items);
    }, [items]);

    const handleBackToProjects = useCallback(() => {
        router.push('/projects');
    }, [router]);

    const handleSelectItem = useCallback((item: SidebarItemData | null) => {
        if (item && item.type === 'folder') {
            // Folders: just select on desktop, don't select on mobile
            setSelectedItem(isMobile ? null : item);
            lastSelectedIdRef.current = null;
        } else if (item) {
            // Files and canvases: open immediately on both mobile and desktop
            setSelectedItem(item);
            setShowDetailOnMobile(true);
            lastSelectedIdRef.current = item.id;
        } else {
            // Null selection
            setSelectedItem(null);
            lastSelectedIdRef.current = null;
        }
    }, [isMobile]);

    const handleContentSaved = useCallback((itemId: string, content: string) => {
        // Update selectedItem
        if (selectedItem && selectedItem.id === itemId) {
            setSelectedItem(prev => prev ? { ...prev, content } : null);
        }
        // Also update the items array so switching files preserves content
        setItems(prev => prev.map(item => 
            item.id === itemId ? { ...item, content } : item
        ));
    }, [selectedItem]);

    const toggleBlankView = useCallback(() => {
        setShowBlankView(prev => !prev);
    }, []);

    const handleConstellationFileClick = useCallback((fileId: string) => {
        // Find the item by ID from the items array
        const clickedItem = items.find(item => item.id === fileId);
        if (clickedItem && clickedItem.type === 'file') {
            // Convert ItemRow to SidebarItem format
            const sidebarItem: SidebarItemData = {
                id: clickedItem.id,
                name: clickedItem.name,
                type: clickedItem.type,
                parentId: clickedItem.parent_id === null ? project!.id : clickedItem.parent_id,
                content: clickedItem.content,
                order: clickedItem.sort_order,
                createdAt: clickedItem.created_at,
                updatedAt: clickedItem.updated_at,
            };
            // Select the item, request fullscreen, and switch back to editor view
            setOpenInFullscreen(true);
            setSelectedItem(sidebarItem);
            setShowBlankView(false);
            setShowDetailOnMobile(true);
        }
    }, [items, project]);

    const handleBackToMaster = useCallback(() => {
        setShowDetailOnMobile(false);
        lastSelectedIdRef.current = null;
    }, []);

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
                    <ArrowLeft size={16} strokeWidth={1} /> Back to Projects
                </button>
            </div>
        );
    }

    if (showBlankView) {
        return (
            <div className={styles.blankView}>
                <IconButton
                    onClick={toggleBlankView}
                    title="Close constellation view"
                    className={styles.blankToggleButton}
                >
                    <X size={18} strokeWidth={1} />
                </IconButton>
                {itemsLoading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                        <p>Loading constellation...</p>
                    </div>
                ) : (
                    <Constellation
                        children={constellationData}
                        onFileClick={handleConstellationFileClick}
                        rootName={project.name}
                    />
                )}
            </div>
        );
    }

    return (
        <main className={styles.main}>
            <Sidebar
                project={project}
                selectedItemId={selectedItem?.id ?? null}
                onSelectItem={handleSelectItem}
                onToggleBlankView={toggleBlankView}
                onBackToProjects={handleBackToProjects}
                onOpenSettings={() => setShowSettings(true)}
            />
            <section className={`${styles.content} ${showDetailOnMobile ? styles.showDetail : ''}`}>
                <DetailPanel
                    selectedItem={selectedItem}
                    projectId={project.id}
                    onContentSaved={handleContentSaved}
                    openInFullscreen={openInFullscreen}
                    onFullscreenOpened={() => setOpenInFullscreen(false)}
                    onBackToMaster={handleBackToMaster}
                />
            </section>

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </main>
    );
}
