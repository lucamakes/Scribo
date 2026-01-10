'use client';

import { useState, useCallback, type MouseEvent } from 'react';
import { Plus, Pencil, X, Folder, File, Layout } from 'lucide-react';
import type { SidebarItemType } from '@/types/sidebar';
import IconButton from '@/components/IconButton/IconButton';
import Dropdown from '@/components/Dropdown/Dropdown';
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

  const handleAddFile = useCallback(() => {
    onAdd(itemId, 'file');
    setShowAddMenu(false);
  }, [onAdd, itemId]);

  const handleAddFolder = useCallback(() => {
    onAdd(itemId, 'folder');
    setShowAddMenu(false);
  }, [onAdd, itemId]);

  const handleAddCanvas = useCallback(() => {
    onAdd(itemId, 'canvas');
    setShowAddMenu(false);
  }, [onAdd, itemId]);

  return (
    <div className={styles.actions}>
      {!isEditing && isFolder && (
        <div className={styles.addWrapper}>
          <IconButton
            onClick={toggleAddMenu}
            size="small"
            title="Add item"
          >
            <Plus size={14} strokeWidth={1} />
          </IconButton>
          {showAddMenu && (
            <Dropdown onClose={() => setShowAddMenu(false)} className={styles.addMenuContent}>
              <div onClick={handleAddFile} className={styles.fileIcon} title="New File">
                <File 
                  size={16} 
                  strokeWidth={1.5} 
                  fill="currentColor" 
                  fillOpacity={0.15}
                />
              </div>
              <div onClick={handleAddCanvas} className={styles.canvasIcon} title="New Canvas">
                <Layout 
                  size={16} 
                  strokeWidth={1.5} 
                  fill="currentColor" 
                  fillOpacity={0.15}
                />
              </div>
              <div onClick={handleAddFolder} className={styles.folderIcon} title="New Folder">
                <Folder 
                  size={16} 
                  strokeWidth={1.5} 
                  fill="currentColor" 
                  fillOpacity={0.15}
                />
              </div>
            </Dropdown>
          )}
        </div>
      )}
      {!isEditing && !isRoot && (
        <>
          <IconButton onClick={handleEdit} size="small" title="Rename">
            <Pencil size={12} strokeWidth={1} />
          </IconButton>
          <IconButton onClick={handleDelete} size="small" title="Delete">
            <X size={12} strokeWidth={1} />
          </IconButton>
        </>
      )}
    </div>
  );
}
