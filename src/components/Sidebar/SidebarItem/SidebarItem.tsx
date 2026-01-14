'use client';

import { useState, useCallback, useRef, useEffect, type DragEvent, type MouseEvent, type TouchEvent } from 'react';
import { ChevronRight, MoreHorizontal, Pencil, Trash2, FileText, FolderPlus, LayoutGrid } from 'lucide-react';
import type { SidebarItem as SidebarItemData, DropPosition, ItemActions } from '@/types/sidebar';
import { SidebarItemIcon } from './SidebarItemIcon';
import { SidebarItemName } from './SidebarItemName';
import { SidebarItemActions, type SidebarItemActionsRef } from './SidebarItemActions';
import { BottomSheet, BottomSheetItem, BottomSheetDivider } from '@/components/BottomSheet/BottomSheet';
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

// Threshold in pixels - if touch moves more than this, it's a scroll not a tap
const SCROLL_THRESHOLD = 10;

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
  const [isMobile, setIsMobile] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const actionsRef = useRef<SidebarItemActionsRef>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isScrollingRef = useRef(false);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseLeave = useCallback(() => {
    actionsRef.current?.closeMenu();
  }, []);

  const isFolder = item.type === 'folder';
  const hasChildren = children.length > 0;
  const isSelected = selectedItemId === item.id;
  const isEditing = editingId === item.id;

  // Bottom sheet handlers
  const handleOpenBottomSheet = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setShowBottomSheet(true);
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    setShowBottomSheet(false);
  }, []);

  const handleRename = useCallback(() => {
    actions.onEdit(item.id);
    setShowBottomSheet(false);
  }, [actions, item.id]);

  const handleDelete = useCallback(() => {
    actions.onDelete(item.id);
    setShowBottomSheet(false);
  }, [actions, item.id]);

  const handleAddFile = useCallback(() => {
    actions.onAdd(item.id, 'file');
    setShowBottomSheet(false);
  }, [actions, item.id]);

  const handleAddFolder = useCallback(() => {
    actions.onAdd(item.id, 'folder');
    setShowBottomSheet(false);
  }, [actions, item.id]);

  const handleAddCanvas = useCallback(() => {
    actions.onAdd(item.id, 'canvas');
    setShowBottomSheet(false);
  }, [actions, item.id]);

  // Touch handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Don't track touches on menu button
    if ((e.target as HTMLElement).closest(`.${styles.mobileMenuButton}`)) {
      return;
    }
    // Don't track touches that start on action buttons
    if ((e.target as HTMLElement).closest(`.${styles.actions}`)) {
      touchStartRef.current = null;
      return;
    }
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isScrollingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    if (deltaX > SCROLL_THRESHOLD || deltaY > SCROLL_THRESHOLD) {
      isScrollingRef.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // If user was scrolling, don't trigger anything
    if (isScrollingRef.current) {
      touchStartRef.current = null;
      isScrollingRef.current = false;
      return;
    }
    
    // If touch didn't start on this item (e.g., started on menu button), ignore
    if (!touchStartRef.current) {
      return;
    }
    
    // Clean tap on mobile - toggle folder or select file
    if (isMobile) {
      e.preventDefault();
      
      if (isFolder && onToggleExpand) {
        onToggleExpand(item.id);
      } else if (!isRoot) {
        actions.onSelect(item);
      }
    }
    
    touchStartRef.current = null;
    isScrollingRef.current = false;
  }, [isFolder, isRoot, actions, item, onToggleExpand, isMobile]);

  // Drag handlers
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

    if (isRoot) {
      setDropPosition('inside');
      return;
    }

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
    const finalPosition = isRoot ? 'inside' : dropPosition;

    if (draggedId && draggedId !== item.id && finalPosition) {
      onDrop(draggedId, item.id, finalPosition);
    }
    setDropPosition(null);
  }, [item.id, dropPosition, onDrop, isRoot]);

  // Click handler - only for mouse (desktop)
  const handleItemClick = useCallback((e: MouseEvent) => {
    // Skip click handling on mobile - touch events handle it
    if (isMobile) return;
    
    if ((e.target as HTMLElement).closest(`.${styles.actions}`)) return;
    if ((e.target as HTMLElement).closest(`.${styles.mobileMenuButton}`)) return;

    if (isFolder && hasChildren && onToggleExpand) {
      onToggleExpand(item.id);
    }

    if (!isRoot) {
      actions.onSelect(item);
    }
  }, [isFolder, isRoot, actions, item, hasChildren, onToggleExpand, isMobile]);

  const getDropClass = () => {
    if (!dropPosition) return '';
    if (isRoot && dropPosition !== 'inside') return '';
    const map = { before: styles.dropBefore, after: styles.dropAfter, inside: styles.dropInside };
    return map[dropPosition] ?? '';
  };

  return (
    <div
      className={`${styles.itemWrapper} ${!isFolder || !hasChildren ? styles.noChevron : ''}`}
      data-item-id={item.id}
    >
      <div
        className={`${styles.item} ${isRoot ? styles.rootItem : ''} ${isDragging ? styles.dragging : ''} ${isSelected ? styles.selected : ''} ${getDropClass()}`}
        draggable={!isRoot && !isMobile}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleItemClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseLeave={handleMouseLeave}
        role="treeitem"
        aria-expanded={isFolder ? isExpanded : undefined}
      >
        <div className={styles.itemContent}>
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

          <SidebarItemIcon type={item.type} isRoot={isRoot} />

          <SidebarItemName
            name={item.name}
            isRoot={isRoot}
            isEditing={isEditing}
            editName={editName ?? ''}
            onEditNameChange={onEditNameChange}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
          />
        </div>

        {/* Desktop: hover actions */}
        <SidebarItemActions
          ref={actionsRef}
          itemId={item.id}
          isFolder={isFolder}
          isRoot={isRoot}
          isEditing={isEditing}
          onEdit={actions.onEdit}
          onDelete={actions.onDelete}
        />

        {/* Mobile: ⋯ button that opens bottom sheet */}
        {isMobile && !isRoot && !isEditing && (
          <button
            className={styles.mobileMenuButton}
            onClick={handleOpenBottomSheet}
            onTouchEnd={(e) => { e.stopPropagation(); handleOpenBottomSheet(e); }}
            aria-label="Item actions"
          >
            <MoreHorizontal size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {isFolder && isExpanded && hasChildren && (
        <div className={styles.children} role="group">
          {children.sort((a, b) => a.order - b.order).map(child => renderItem(child, depth + 1))}
        </div>
      )}

      {/* Bottom sheet for mobile actions */}
      <BottomSheet
        isOpen={showBottomSheet}
        onClose={handleCloseBottomSheet}
        title={item.name}
      >
        {isFolder && (
          <>
            <BottomSheetItem
              icon={<FileText size={20} strokeWidth={1.5} />}
              label="New File"
              onClick={handleAddFile}
            />
            <BottomSheetItem
              icon={<FolderPlus size={20} strokeWidth={1.5} />}
              label="New Folder"
              onClick={handleAddFolder}
            />
            <BottomSheetItem
              icon={<LayoutGrid size={20} strokeWidth={1.5} />}
              label="New Canvas"
              onClick={handleAddCanvas}
            />
            <BottomSheetDivider />
          </>
        )}
        <BottomSheetItem
          icon={<Pencil size={20} strokeWidth={1.5} />}
          label="Rename"
          onClick={handleRename}
        />
        <BottomSheetItem
          icon={<Trash2 size={20} strokeWidth={1.5} />}
          label="Delete"
          onClick={handleDelete}
          danger
        />
      </BottomSheet>
    </div>
  );
}
