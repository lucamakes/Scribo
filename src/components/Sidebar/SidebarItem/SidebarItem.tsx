'use client';

import { useState, useCallback, useRef, useEffect, type DragEvent, type MouseEvent, type TouchEvent } from 'react';
import { ChevronRight, MoreHorizontal, Pencil, Trash2, Plus, FileText, FolderPlus, LayoutGrid } from 'lucide-react';
import type { SidebarItem as SidebarItemData, DropPosition, ItemActions } from '@/types/sidebar';
import { SidebarItemIcon } from './SidebarItemIcon';
import { SidebarItemName } from './SidebarItemName';
import { SidebarItemActions, type SidebarItemActionsRef } from './SidebarItemActions';
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const actionsRef = useRef<SidebarItemActionsRef>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isScrollingRef = useRef(false);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!showMobileMenu) return;
    
    const handleClickOutside = (e: Event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    // Small delay to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMobileMenu]);

  const handleMouseLeave = useCallback(() => {
    actionsRef.current?.closeAddMenu();
  }, []);

  const isFolder = item.type === 'folder';
  const hasChildren = children.length > 0;
  const isSelected = selectedItemId === item.id;
  const isEditing = editingId === item.id;

  // Mobile menu handlers
  const handleMobileMenuToggle = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setShowMobileMenu(prev => !prev);
  }, []);

  const handleMobileRename = useCallback(() => {
    actions.onEdit(item.id);
    setShowMobileMenu(false);
  }, [actions, item.id]);

  const handleMobileDelete = useCallback(() => {
    actions.onDelete(item.id);
    setShowMobileMenu(false);
  }, [actions, item.id]);

  const handleMobileAddFile = useCallback(() => {
    actions.onAdd(item.id, 'file');
    setShowMobileMenu(false);
  }, [actions, item.id]);

  const handleMobileAddFolder = useCallback(() => {
    actions.onAdd(item.id, 'folder');
    setShowMobileMenu(false);
  }, [actions, item.id]);

  const handleMobileAddCanvas = useCallback(() => {
    actions.onAdd(item.id, 'canvas');
    setShowMobileMenu(false);
  }, [actions, item.id]);

  // Touch handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Don't track touches on menu button or menu
    if ((e.target as HTMLElement).closest(`.${styles.mobileMenuButton}`) ||
        (e.target as HTMLElement).closest(`.${styles.mobileMenu}`)) {
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

  const handleTouchEnd = useCallback(() => {
    // If user was scrolling, don't trigger anything
    if (isScrollingRef.current) {
      touchStartRef.current = null;
      isScrollingRef.current = false;
      return;
    }
    
    // Clean tap on mobile
    if (touchStartRef.current && isMobile) {
      // Close menu if open
      if (showMobileMenu) {
        setShowMobileMenu(false);
      } else {
        if (isFolder) {
          if (onToggleExpand) {
            onToggleExpand(item.id);
          }
        } else if (!isRoot) {
          actions.onSelect(item);
        }
      }
    }
    
    touchStartRef.current = null;
    isScrollingRef.current = false;
  }, [isFolder, isRoot, actions, item, onToggleExpand, isMobile, showMobileMenu]);

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
    if ((e.target as HTMLElement).closest(`.${styles.actions}`)) return;
    if ((e.target as HTMLElement).closest(`.${styles.mobileMenuButton}`)) return;
    if ((e.target as HTMLElement).closest(`.${styles.mobileMenu}`)) return;

    if (isFolder && hasChildren && onToggleExpand) {
      onToggleExpand(item.id);
    }

    if (!isRoot) {
      actions.onSelect(item);
    }
  }, [isFolder, isRoot, actions, item, hasChildren, onToggleExpand]);

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

        {/* Mobile: always-visible ⋯ button */}
        {isMobile && !isRoot && !isEditing && (
          <div className={styles.mobileMenuWrapper} ref={mobileMenuRef}>
            <button
              className={styles.mobileMenuButton}
              onClick={handleMobileMenuToggle}
              onTouchEnd={(e) => { e.stopPropagation(); handleMobileMenuToggle(e); }}
              aria-label="Item actions"
            >
              <MoreHorizontal size={18} strokeWidth={1.5} />
            </button>

            {showMobileMenu && (
              <div className={styles.mobileMenu}>
                {isFolder && (
                  <>
                    <button className={styles.mobileMenuItem} onClick={handleMobileAddFile}>
                      <FileText size={16} strokeWidth={1.5} />
                      <span>New File</span>
                    </button>
                    <button className={styles.mobileMenuItem} onClick={handleMobileAddFolder}>
                      <FolderPlus size={16} strokeWidth={1.5} />
                      <span>New Folder</span>
                    </button>
                    <button className={styles.mobileMenuItem} onClick={handleMobileAddCanvas}>
                      <LayoutGrid size={16} strokeWidth={1.5} />
                      <span>New Canvas</span>
                    </button>
                    <div className={styles.mobileMenuDivider} />
                  </>
                )}
                <button className={styles.mobileMenuItem} onClick={handleMobileRename}>
                  <Pencil size={16} strokeWidth={1.5} />
                  <span>Rename</span>
                </button>
                <button className={`${styles.mobileMenuItem} ${styles.danger}`} onClick={handleMobileDelete}>
                  <Trash2 size={16} strokeWidth={1.5} />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isFolder && isExpanded && hasChildren && (
        <div className={styles.children} role="group">
          {children.sort((a, b) => a.order - b.order).map(child => renderItem(child, depth + 1))}
        </div>
      )}
    </div>
  );
}
