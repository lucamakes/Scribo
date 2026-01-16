'use client';

import { useState, useCallback, useImperativeHandle, forwardRef, useRef, useEffect, useContext, type TouchEvent } from 'react';
import { MoreHorizontal, Pencil, Trash2, File, Folder, Layout } from 'lucide-react';
import { SidebarContext } from '../SidebarContext';
import type { SidebarItemType } from '@/types/sidebar';
import styles from './SidebarItem.module.css';

export interface SidebarItemActionsRef {
  closeMenu: () => void;
}

interface SidebarItemActionsProps {
  itemId: string;
  isFolder: boolean;
  isRoot: boolean;
  isEditing: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd?: (parentId: string, type: SidebarItemType) => void;
}

export const SidebarItemActions = forwardRef<SidebarItemActionsRef, SidebarItemActionsProps>(
  function SidebarItemActions({
    itemId,
    isFolder,
    isRoot,
    isEditing,
    onEdit,
    onDelete,
    onAdd,
  }, ref) {
  // Use context if available, otherwise use the prop
  const sidebarContext = useContext(SidebarContext);
  const addItem = onAdd ?? sidebarContext?.actions.onAdd;
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(ref, () => ({
    closeMenu: () => setShowMenu(false),
  }), []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Stop touch events from bubbling to parent item
  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.stopPropagation();
  }, []);

  const handleToggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(prev => !prev);
  }, []);

  const handleEdit = useCallback(() => {
    if (!isRoot) onEdit(itemId);
    setShowMenu(false);
  }, [onEdit, itemId, isRoot]);

  const handleDelete = useCallback(() => {
    if (!isRoot) onDelete(itemId);
    setShowMenu(false);
  }, [onDelete, itemId, isRoot]);

  const handleAddFile = useCallback(() => {
    if (addItem) addItem(itemId, 'file');
    setShowMenu(false);
  }, [addItem, itemId]);

  const handleAddFolder = useCallback(() => {
    if (addItem) addItem(itemId, 'folder');
    setShowMenu(false);
  }, [addItem, itemId]);

  const handleAddCanvas = useCallback(() => {
    if (addItem) addItem(itemId, 'canvas');
    setShowMenu(false);
  }, [addItem, itemId]);

  // Don't show anything if editing or if it's root with no folder actions
  if (isEditing) return null;
  if (isRoot && !isFolder) return null;

  return (
    <div className={styles.actions} onTouchStart={handleTouchStart}>
      <button
        ref={buttonRef}
        className={styles.actionsButton}
        onClick={handleToggleMenu}
        title="More actions"
      >
        <MoreHorizontal size={16} strokeWidth={1.5} />
      </button>

      {showMenu && (
        <div className={styles.actionsDropdown} ref={menuRef}>
          {isFolder && (
            <>
              <button className={styles.dropdownItem} onClick={handleAddFile}>
                <File size={14} strokeWidth={1.5} fill="currentColor" fillOpacity={0.15} className={styles.fileIconColor} />
                <span>New File</span>
              </button>
              <button className={styles.dropdownItem} onClick={handleAddFolder}>
                <Folder size={14} strokeWidth={1.5} fill="currentColor" fillOpacity={0.15} className={styles.folderIconColor} />
                <span>New Folder</span>
              </button>
              <button className={styles.dropdownItem} onClick={handleAddCanvas}>
                <Layout size={14} strokeWidth={1.5} fill="currentColor" fillOpacity={0.15} className={styles.canvasIconColor} />
                <span>New Canvas</span>
              </button>
              {!isRoot && <div className={styles.dropdownDivider} />}
            </>
          )}
          {!isRoot && (
            <>
              <button className={styles.dropdownItem} onClick={handleEdit}>
                <Pencil size={14} strokeWidth={1.5} />
                <span>Rename</span>
              </button>
              <button className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={handleDelete}>
                <Trash2 size={14} strokeWidth={1.5} />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});