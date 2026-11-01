'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import type { SidebarItem as SidebarItemData } from '@/types/sidebar';
import type { Project } from '@/types/project';
import { SidebarProvider, useSidebar } from './SidebarContext';
import { SidebarHeader } from './SidebarHeader/SidebarHeader';
import { SidebarContent } from './SidebarContent/SidebarContent';
import { SidebarGoals } from './SidebarGoals/SidebarGoals';
import { SidebarModals } from './SidebarModals/SidebarModals';
import { SidebarSearch } from './SidebarSearch/SidebarSearch';
import { AddItemModal } from './AddItemModal/AddItemModal';
import styles from './Sidebar.module.css';

interface SidebarProps {
  project: Project;
  selectedItemId: string | null;
  onSelectItem: (item: SidebarItemData | null) => void;
  onToggleBlankView?: () => void;
  onBackToProjects?: () => void;
  onOpenSettings?: () => void;
}

const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 600;
const SIDEBAR_WIDTH_STORAGE_KEY = 'scribo:sidebarWidth';

function SidebarInner({ onToggleBlankView, onBackToProjects, onOpenSettings }: {
  onToggleBlankView?: () => void;
  onBackToProjects?: () => void;
  onOpenSettings?: () => void;
}) {
  const { project, rootId, getItemChildren, expandedIds, loading, error, addModalParentId, setAddModalParentId, actions } = useSidebar();

  // User-defined width (null until the user resizes or a stored value is loaded)
  const [manualWidth, setManualWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const asideRef = useRef<HTMLElement>(null);

  // Load any persisted width on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!Number.isNaN(parsed)) {
          setManualWidth(Math.min(Math.max(parsed, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH));
        }
      }
    } catch {
      // Ignore storage access errors (e.g. private mode)
    }
  }, []);

  // Calculate max VISIBLE depth based on expanded folders
  const maxDepth = useMemo(() => {
    const getVisibleMaxDepth = (itemId: string, currentDepth: number): number => {
      if (!expandedIds.has(itemId)) return currentDepth;
      
      const children = getItemChildren(itemId);
      if (children.length === 0) return currentDepth;
      
      return Math.max(...children.map(child => {
        if (child.type === 'folder') {
          return getVisibleMaxDepth(child.id, currentDepth + 1);
        }
        return currentDepth + 1;
      }));
    };
    return getVisibleMaxDepth(rootId, 0);
  }, [getItemChildren, rootId, expandedIds]);

  // Calculate dynamic width (used until the user manually resizes)
  const autoWidth = useMemo(() => {
    const baseWidth = 260;
    const widthPerLevel = 24;
    return Math.min(baseWidth + (maxDepth * widthPerLevel), 500);
  }, [maxDepth]);

  const sidebarWidth = manualWidth ?? autoWidth;

  // Persist the width whenever the user sets it manually
  const persistWidth = useCallback((width: number) => {
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width));
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = asideRef.current?.offsetWidth ?? sidebarWidth;
    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const next = Math.min(
        Math.max(startWidth + delta, MIN_SIDEBAR_WIDTH),
        MAX_SIDEBAR_WIDTH
      );
      setManualWidth(next);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setManualWidth(current => {
        if (current !== null) persistWidth(current);
        return current;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth, persistWidth]);

  // Double-click the handle to reset to the automatic width
  const handleResetWidth = useCallback(() => {
    setManualWidth(null);
    try {
      window.localStorage.removeItem(SIDEBAR_WIDTH_STORAGE_KEY);
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const resizeHandle = (
    <div
      className={`${styles.resizeHandle} ${isResizing ? styles.resizing : ''}`}
      onMouseDown={handleResizeStart}
      onDoubleClick={handleResetWidth}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      title="Drag to resize · Double-click to reset"
    />
  );

  if (loading) {
    return (
      <aside
        ref={asideRef}
        className={`${styles.sidebar} ${isResizing ? styles.noTransition : ''}`}
        style={{ width: `${sidebarWidth}px` }}
      >
        <SidebarHeader 
          onToggleBlankView={onToggleBlankView}
          onBackToProjects={onBackToProjects}
          onOpenSettings={onOpenSettings}
        />
        <div className={styles.loading}>Loading...</div>
        {resizeHandle}
      </aside>
    );
  }

  return (
    <aside 
      ref={asideRef}
      className={`${styles.sidebar} ${isResizing ? styles.noTransition : ''}`}
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
      
      {addModalParentId && (
        <AddItemModal
          parentId={addModalParentId}
          onAdd={actions.onAdd}
          onClose={() => setAddModalParentId(null)}
        />
      )}

      {resizeHandle}
    </aside>
  );
}

export function Sidebar({ 
  project, 
  selectedItemId, 
  onSelectItem, 
  onToggleBlankView, 
  onBackToProjects, 
  onOpenSettings
}: SidebarProps) {
  return (
    <SidebarProvider
      project={project}
      selectedItemId={selectedItemId}
      onSelectItem={onSelectItem}
    >
      <SidebarInner
        onToggleBlankView={onToggleBlankView}
        onBackToProjects={onBackToProjects}
        onOpenSettings={onOpenSettings}
      />
    </SidebarProvider>
  );
}
