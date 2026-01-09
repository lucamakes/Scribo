'use client';

import { useMemo } from 'react';
import type { SidebarItem as SidebarItemData } from '@/types/sidebar';
import type { Project } from '@/types/project';
import { SidebarProvider, useSidebar } from './SidebarContext';
import { SidebarHeader } from './SidebarHeader/SidebarHeader';
import { SidebarContent } from './SidebarContent/SidebarContent';
import { SidebarGoals } from './SidebarGoals/SidebarGoals';
import { SidebarModals } from './SidebarModals/SidebarModals';
import { SidebarSearch } from './SidebarSearch/SidebarSearch';
import styles from './Sidebar.module.css';

interface SidebarProps {
  project: Project;
  selectedItemId: string | null;
  onSelectItem: (item: SidebarItemData | null) => void;
  onToggleBlankView?: () => void;
  onBackToProjects?: () => void;
  onOpenSettings?: () => void;
  isDemo?: boolean;
}

function SidebarInner({ onToggleBlankView, onBackToProjects, onOpenSettings }: {
  onToggleBlankView?: () => void;
  onBackToProjects?: () => void;
  onOpenSettings?: () => void;
}) {
  const { project, items, rootId, expandedIds, loading, error } = useSidebar();

  // Calculate max VISIBLE depth based on expanded folders
  const maxDepth = useMemo(() => {
    const getVisibleMaxDepth = (itemId: string, currentDepth: number): number => {
      if (!expandedIds.has(itemId)) return currentDepth;
      
      const children = items.filter(i => i.parentId === itemId);
      if (children.length === 0) return currentDepth;
      
      return Math.max(...children.map(child => {
        if (child.type === 'folder') {
          return getVisibleMaxDepth(child.id, currentDepth + 1);
        }
        return currentDepth + 1;
      }));
    };
    return getVisibleMaxDepth(rootId, 0);
  }, [items, rootId, expandedIds]);

  // Calculate dynamic width
  const sidebarWidth = useMemo(() => {
    const baseWidth = 260;
    const widthPerLevel = 24;
    return Math.min(baseWidth + (maxDepth * widthPerLevel), 500);
  }, [maxDepth]);

  if (loading) {
    return (
      <aside className={styles.sidebar} style={{ width: `${sidebarWidth}px` }}>
        <SidebarHeader 
          onToggleBlankView={onToggleBlankView}
          onBackToProjects={onBackToProjects}
          onOpenSettings={onOpenSettings}
        />
        <div className={styles.loading}>Loading...</div>
      </aside>
    );
  }

  return (
    <aside 
      className={styles.sidebar} 
      style={{ width: `${sidebarWidth}px` }} 
      role="tree" 
      aria-label="File explorer"
    >
      <SidebarHeader 
        onToggleBlankView={onToggleBlankView}
        onBackToProjects={onBackToProjects}
        onOpenSettings={onOpenSettings}
      />
      
      {error && <div className={styles.error}>{error}</div>}
      
      <SidebarContent />
      <SidebarGoals />
      <SidebarModals />
      <SidebarSearch />
    </aside>
  );
}

export function Sidebar({ 
  project, 
  selectedItemId, 
  onSelectItem, 
  onToggleBlankView, 
  onBackToProjects, 
  onOpenSettings, 
  isDemo = false 
}: SidebarProps) {
  return (
    <SidebarProvider
      project={project}
      selectedItemId={selectedItemId}
      onSelectItem={onSelectItem}
      isDemo={isDemo}
    >
      <SidebarInner
        onToggleBlankView={onToggleBlankView}
        onBackToProjects={onBackToProjects}
        onOpenSettings={onOpenSettings}
      />
    </SidebarProvider>
  );
}
