'use client';

import { useState, useCallback, type MouseEvent } from 'react';
import { Plus, Pencil, X, Folder, File, Layout } from 'lucide-react';
import type { SidebarItemType } from '@/types/sidebar';
import styles from './SidebarItem.module.css';

interface SidebarItemActionsProps {
  itemId: string;
  isFolder: boolean;
  isRoot: boolean;
  isEditing: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (parentId: string, type: SidebarItemType) => void;
}

export function SidebarItemActions({
  itemId,
  isFolder,
  isRoot,
  isEditing,
  onEdit,
  onDelete,
  onAdd,
}: SidebarItemActionsProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleEdit = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    if (!isRoot) onEdit(itemId);
  }, [onEdit, itemId, isRoot]);

  const handleDelete = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    if (!isRoot) onDelete(itemId);
  }, [onDelete, itemId, isRoot]);

  const toggleAddMenu = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setShowAddMenu(prev => !prev);
  }, []);

  const handleAddFile = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    onAdd(itemId, 'file');
    setShowAddMenu(false);
  }, [onAdd, itemId]);

  const handleAddFolder = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    onAdd(itemId, 'folder');
    setShowAddMenu(false);
  }, [onAdd, itemId]);

  const handleAddCanvas = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    onAdd(itemId, 'canvas');
    setShowAddMenu(false);
  }, [onAdd, itemId]);

  return (
    <div className={styles.actions}>
      {!isEditing && isFolder && (
        <div className={styles.addWrapper}>
          <button
            onClick={toggleAddMenu}
            className={styles.actionBtn}
            aria-label="Add"
            title="Add item"
          >
            <Plus size={14} strokeWidth={1} />
          </button>
          {showAddMenu && (
            <div className={styles.addMenu}>
              <button onClick={handleAddFile} className={styles.menuItem}>
                <span className={styles.menuFileIcon}>
                  <File size={14} strokeWidth={1.5} fill="currentColor" fillOpacity={0.15} />
                </span> 
                New File
              </button>
              <button onClick={handleAddCanvas} className={styles.menuItem}>
                <span className={styles.menuCanvasIcon}>
                  <Layout size={14} strokeWidth={1.5} fill="currentColor" fillOpacity={0.15} />
                </span> 
                New Canvas
              </button>
              <button onClick={handleAddFolder} className={styles.menuItem}>
                <span className={styles.menuFolderIcon}>
                  <Folder size={14} strokeWidth={1.5} fill="currentColor" fillOpacity={0.15} />
                </span> 
                New Folder
              </button>
            </div>
          )}
        </div>
      )}
      {!isEditing && !isRoot && (
        <>
          <button onClick={handleEdit} className={styles.actionBtn} aria-label="Edit" title="Rename">
            <Pencil size={12} strokeWidth={1} />
          </button>
          <button onClick={handleDelete} className={styles.actionBtn} aria-label="Delete" title="Delete">
            <X size={12} strokeWidth={1} />
          </button>
        </>
      )}
    </div>
  );
}
