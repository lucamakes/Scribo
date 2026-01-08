'use client';

import { useState, useCallback, type DragEvent, type MouseEvent } from 'react';
import type { SidebarItem as SidebarItemData, DropPosition, ItemActions } from '@/types/sidebar';
import styles from './SidebarItem.module.css';

interface SidebarItemProps {
  item: SidebarItemData;
  children: SidebarItemData[];
  allItems: SidebarItemData[];
  depth: number;
  onDrop: (draggedId: string, targetId: string, position: DropPosition) => void;
  renderItem: (item: SidebarItemData, depth: number) => React.ReactNode;
  actions: ItemActions;
  isRoot?: boolean;
  selectedItemId?: string | null;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  editingId?: string | null;
  editName?: string;
  onEditNameChange?: (name: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
}

// Icons
import { Folder, File, ChevronRight, Pencil, X, Plus, Layout } from 'lucide-react';

/**
 * Sidebar item with updated styling matches.
 * Uses CSS nesting for indentation and tree lines.
 */
export function SidebarItem({
  item,
  children,
  depth,
  onDrop,
  renderItem,
  actions,
  isRoot = false,
  selectedItemId,
  isExpanded = false,
  onToggleExpand,
  editingId,
  editName,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
}: SidebarItemProps) {
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const isFolder = item.type === 'folder';
  const hasChildren = children.length > 0;
  const isSelected = selectedItemId === item.id;

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (isRoot) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  }, [item.id, isRoot]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    // Root folder can only accept 'inside' drops
    if (isRoot) {
      setDropPosition('inside');
      return;
    }

    // For expanded empty folders, treat more area as 'inside'
    const isExpandedEmptyFolder = isFolder && isExpanded && !hasChildren;

    if (isFolder && y > height * 0.25 && y < height * 0.75) {
      setDropPosition('inside');
    } else if (y < height * 0.5) {
      setDropPosition('before');
    } else {
      setDropPosition(isExpandedEmptyFolder ? 'inside' : 'after');
    }
  }, [isFolder, isRoot, isExpanded, hasChildren]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropPosition(null);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData('text/plain');

    // Root can only receive 'inside' drops
    const finalPosition = isRoot ? 'inside' : dropPosition;

    if (draggedId && draggedId !== item.id && finalPosition) {
      onDrop(draggedId, item.id, finalPosition);
    }
    setDropPosition(null);
  }, [item.id, dropPosition, onDrop, isRoot]);

  const handleItemClick = useCallback((e: MouseEvent) => {
    if ((e.target as HTMLElement).closest(`.${styles.actions}`)) return;

    // Toggle expand for folders - ONLY if they have children
    if (isFolder && hasChildren && onToggleExpand) {
      onToggleExpand(item.id);
    }

    // Select the item (unless it's root)
    if (!isRoot) {
      actions.onSelect(item);
    }
  }, [isFolder, isRoot, actions, item, hasChildren, onToggleExpand]);

  const handleEdit = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    if (!isRoot) actions.onEdit(item.id);
  }, [actions, item.id, isRoot]);

  const handleDelete = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    if (!isRoot) actions.onDelete(item.id);
  }, [actions, item.id, isRoot]);

  const toggleAddMenu = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    setShowAddMenu(prev => !prev);
  }, []);

  const handleAddFile = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    actions.onAdd(item.id, 'file');
    setShowAddMenu(false);
  }, [actions, item.id]);

  const handleAddFolder = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    actions.onAdd(item.id, 'folder');
    setShowAddMenu(false);
  }, [actions, item.id]);

  const handleAddCanvas = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    actions.onAdd(item.id, 'canvas');
    setShowAddMenu(false);
  }, [actions, item.id]);



  const getDropClass = () => {
    if (!dropPosition) return '';
    if (isRoot && dropPosition !== 'inside') return '';
    const map = { before: styles.dropBefore, after: styles.dropAfter, inside: styles.dropInside };
    return map[dropPosition] ?? '';
  };

  return (
    <div className={`${styles.itemWrapper} ${!isFolder || !hasChildren ? styles.noChevron : ''}`} data-item-id={item.id}>
      <div
        className={`${styles.item} ${isRoot ? styles.rootItem : ''} ${isDragging ? styles.dragging : ''} ${isSelected ? styles.selected : ''} ${getDropClass()}`}
        draggable={!isRoot}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleItemClick}
        role="treeitem"
        aria-expanded={isFolder ? isExpanded : undefined}
      >
        <div className={styles.itemContent}>
          {/* Chevron for all folders including root */}
          <span className={`${styles.chevron} ${!isFolder || !hasChildren ? styles.invisible : ''}`}>
            {isFolder && (
              <ChevronRight
                size={10}
                strokeWidth={2.5}
                style={{
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
            )}
          </span>

          <span className={`${styles.icon} ${item.type === 'folder' ? styles.folderIcon : item.type === 'canvas' ? styles.canvasIcon : styles.fileIcon}`}>
            {item.type === 'folder'
              ? <Folder size={14} strokeWidth={1} fill="currentColor" fillOpacity={0.15} />
              : item.type === 'canvas'
              ? <Layout size={14} strokeWidth={1} fill="currentColor" fillOpacity={0.15} />
              : <File size={14} strokeWidth={1} fill="currentColor" fillOpacity={0.15} />
            }
          </span>

          {editingId === item.id ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => onEditNameChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSaveEdit?.();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancelEdit?.();
                }
              }}
              onBlur={onSaveEdit}
              onClick={(e) => e.stopPropagation()}
              className={styles.editInput}
              autoFocus
            />
          ) : (
            <span className={`${styles.name} ${isRoot ? styles.rootName : ''}`}>
              {item.name.length > 15 ? item.name.slice(0, 15) + '...' : item.name}
            </span>
          )}
        </div>

        <div className={styles.actions}>
          {!editingId && isFolder && (
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
                    <span className={styles.menuFileIcon}><File size={14} strokeWidth={1.5} fill="currentColor" fillOpacity={0.15} /></span> New File
                  </button>
                  <button onClick={handleAddCanvas} className={styles.menuItem}>
                    <span className={styles.menuCanvasIcon}><Layout size={14} strokeWidth={1.5} fill="currentColor" fillOpacity={0.15} /></span> New Canvas
                  </button>
                  <button onClick={handleAddFolder} className={styles.menuItem}>
                    <span className={styles.menuFolderIcon}><Folder size={14} strokeWidth={1.5} fill="currentColor" fillOpacity={0.15} /></span> New Folder
                  </button>
                </div>
              )}
            </div>
          )}
          {!editingId && !isRoot && (
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
      </div>

      {isFolder && isExpanded && hasChildren && (
        <div className={styles.children} role="group">
          {children.sort((a, b) => a.order - b.order).map(child => renderItem(child, depth + 1))}
        </div>
      )}
    </div>
  );
}

interface EmptyFolderDropZoneProps {
  folderId: string;
  depth: number;
  onDrop: (draggedId: string, targetId: string, position: DropPosition) => void;
}

function EmptyFolderDropZone({ folderId, depth, onDrop }: EmptyFolderDropZoneProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsOver(false), []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId) onDrop(draggedId, folderId, 'inside');
    setIsOver(false);
  }, [folderId, onDrop]);

  return (
    <div
      className={`${styles.emptyZone} ${isOver ? styles.emptyZoneActive : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span className={styles.emptyText}></span>
    </div>
  );
}
