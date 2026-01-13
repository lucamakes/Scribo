'use client';

import { useCallback, useImperativeHandle, forwardRef, type TouchEvent } from 'react';
import { Plus, Pencil, X } from 'lucide-react';
import { useSidebar } from '../SidebarContext';
import IconButton from '@/components/IconButton/IconButton';
import styles from './SidebarItem.module.css';

export interface SidebarItemActionsRef {
  closeAddMenu: () => void;
}

interface SidebarItemActionsProps {
  itemId: string;
  isFolder: boolean;
  isRoot: boolean;
  isEditing: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SidebarItemActions = forwardRef<SidebarItemActionsRef, SidebarItemActionsProps>(
  function SidebarItemActions({
    itemId,
    isFolder,
    isRoot,
    isEditing,
    onEdit,
    onDelete,
  }, ref) {
  const { setAddModalParentId } = useSidebar();

  useImperativeHandle(ref, () => ({
    closeAddMenu: () => {}, // No longer needed but kept for compatibility
  }), []);

  // Stop touch events from bubbling to parent item
  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.stopPropagation();
  }, []);

  const handleEdit = useCallback(() => {
    if (!isRoot) onEdit(itemId);
  }, [onEdit, itemId, isRoot]);

  const handleDelete = useCallback(() => {
    if (!isRoot) onDelete(itemId);
  }, [onDelete, itemId, isRoot]);

  const handleOpenAddModal = useCallback(() => {
    setAddModalParentId(itemId);
  }, [setAddModalParentId, itemId]);

  return (
    <div className={styles.actions} onTouchStart={handleTouchStart}>
      {!isEditing && isFolder && (
        <IconButton
          onClick={handleOpenAddModal}
          size="small"
          title="Add item"
        >
          <Plus size={14} strokeWidth={1} />
        </IconButton>
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
});