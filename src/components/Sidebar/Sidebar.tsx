'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SidebarItem as SidebarItemData, DropPosition, SidebarItemType, ItemActions } from '@/types/sidebar';
import type { Project } from '@/types/project';
import { itemService } from '@/lib/services/itemService';
import { SidebarItem } from './SidebarItem/SidebarItem';
import styles from './Sidebar.module.css';

interface SidebarProps {
  project: Project;
}

function wouldCreateCycle(items: SidebarItemData[], draggedId: string, targetId: string): boolean {
  const draggedItem = items.find(i => i.id === draggedId);
  if (!draggedItem || draggedItem.type !== 'folder') return false;

  let currentId: string | null = targetId;
  while (currentId) {
    if (currentId === draggedId) return true;
    const current = items.find(i => i.id === currentId);
    currentId = current?.parentId ?? null;
  }
  return false;
}

function getChildren(items: SidebarItemData[], parentId: string | null): SidebarItemData[] {
  return items.filter(i => i.parentId === parentId).sort((a, b) => a.order - b.order);
}

/**
 * Converts database ItemRow to SidebarItem format.
 * Maps null parent_id to ROOT_ID for UI consistency.
 */
function dbItemToSidebarItem(
  dbItem: { id: string; name: string; type: 'file' | 'folder'; parent_id: string | null; sort_order: number; created_at: string; updated_at: string },
  rootId: string
): SidebarItemData {
  return {
    id: dbItem.id,
    name: dbItem.name,
    type: dbItem.type,
    // Map null to ROOT_ID for UI (root-level items appear under project folder)
    parentId: dbItem.parent_id === null ? rootId : dbItem.parent_id,
    order: dbItem.sort_order,
    createdAt: dbItem.created_at,
    updatedAt: dbItem.updated_at,
  };
}

/**
 * Converts UI parentId to database parent_id.
 * Maps ROOT_ID to null for database storage.
 */
function uiParentIdToDb(parentId: string, rootId: string): string | null {
  return parentId === rootId ? null : parentId;
}

/**
 * Main sidebar component with project root folder.
 * Loads and saves items from Supabase.
 * 
 * Database uses NULL for root-level items.
 * UI uses ROOT_ID (project.id) for root-level items.
 */
export function Sidebar({ project }: SidebarProps) {
  const ROOT_ID = project.id;

  const [items, setItems] = useState<SidebarItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Load items from database
  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      setError(null);
      const result = await itemService.getByProject(project.id);
      
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Convert DB items to UI format (null -> ROOT_ID)
      const sidebarItems = result.data.map(item => dbItemToSidebarItem(item, ROOT_ID));
      setItems(sidebarItems);
      setLoading(false);
    };

    loadItems();
  }, [project.id, ROOT_ID]);

  const handleDrop = useCallback(async (draggedId: string, targetId: string, position: DropPosition) => {
    const draggedItem = items.find(i => i.id === draggedId);
    const targetItem = items.find(i => i.id === targetId);
    if (!draggedItem || !targetItem) return;
    if (wouldCreateCycle(items, draggedId, targetId)) return;

    // Determine new parent in UI terms
    let uiParentId: string;
    if (position === 'inside') {
      if (targetItem.type !== 'folder') return;
      uiParentId = targetId;
    } else {
      // For before/after, use target's parent
      // If target is at root (parentId === ROOT_ID), stay at root
      uiParentId = targetItem.parentId ?? ROOT_ID;
    }

    // Optimistic update
    const newItems = [...items];
    const draggedIndex = newItems.findIndex(i => i.id === draggedId);
    let newOrder: number;

    if (position === 'inside') {
      newOrder = getChildren(newItems, targetId).length;
    } else {
      const targetOrder = targetItem.order;
      newOrder = position === 'before' ? targetOrder : targetOrder + 1;

      newItems.forEach(item => {
        if (item.parentId === uiParentId && item.id !== draggedId && item.order >= newOrder) {
          item.order += 1;
        }
      });
    }

    newItems[draggedIndex] = {
      ...draggedItem,
      parentId: uiParentId,
      order: newOrder,
      updatedAt: new Date().toISOString(),
    };

    if (draggedItem.parentId !== uiParentId) {
      const oldSiblings = newItems
        .filter(i => i.parentId === draggedItem.parentId && i.id !== draggedId)
        .sort((a, b) => a.order - b.order);
      oldSiblings.forEach((item, idx) => {
        const itemIndex = newItems.findIndex(i => i.id === item.id);
        if (itemIndex !== -1) newItems[itemIndex] = { ...newItems[itemIndex], order: idx };
      });
    }

    const newSiblings = newItems
      .filter(i => i.parentId === uiParentId)
      .sort((a, b) => a.order - b.order);
    newSiblings.forEach((item, idx) => {
      const itemIndex = newItems.findIndex(i => i.id === item.id);
      if (itemIndex !== -1) newItems[itemIndex] = { ...newItems[itemIndex], order: idx };
    });

    setItems(newItems);

    // Save to database (convert ROOT_ID to null)
    const dbParentId = uiParentIdToDb(uiParentId, ROOT_ID);
    
    // Find the final order after normalization
    const finalItem = newItems.find(i => i.id === draggedId);
    const finalOrder = finalItem?.order ?? 0;
    
    const moveResult = await itemService.move(draggedId, dbParentId, project.id, finalOrder);
    if (!moveResult.success) {
      setError(moveResult.error);
      // Revert optimistic update by reloading from server
      const reloadResult = await itemService.getByProject(project.id);
      if (reloadResult.success) {
        setItems(reloadResult.data.map(item => dbItemToSidebarItem(item, ROOT_ID)));
      } else {
        setItems(items);
      }
    }
    // Don't update from server response - keep optimistic update
    // Server has the same data now
  }, [items, project.id, ROOT_ID]);

  const handleEdit = useCallback((id: string) => {
    if (id === ROOT_ID) return;
    const item = items.find(i => i.id === id);
    if (item) {
      setEditingId(id);
      setEditName(item.name);
    }
  }, [items, ROOT_ID]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId || !editName.trim()) return;
    
    const result = await itemService.rename(editingId, editName.trim());
    if (!result.success) {
      setError(result.error);
      return;
    }

    const updatedItem = dbItemToSidebarItem(result.data as any, ROOT_ID);
    setItems(prev => prev.map(item => item.id === editingId ? updatedItem : item));
    setEditingId(null);
    setEditName('');
  }, [editingId, editName, ROOT_ID]);

  const handleDelete = useCallback(async (id: string) => {
    if (id === ROOT_ID) return;
    
    const idsToDelete = new Set<string>();
    const collectChildren = (parentId: string) => {
      idsToDelete.add(parentId);
      items.filter(i => i.parentId === parentId).forEach(child => collectChildren(child.id));
    };
    collectChildren(id);

    // Optimistic update
    setItems(prev => prev.filter(i => !idsToDelete.has(i.id)));

    // Delete from database (cascades automatically)
    const result = await itemService.delete(id);
    if (!result.success) {
      setError(result.error);
      // Reload items on error
      const reloadResult = await itemService.getByProject(project.id);
      if (reloadResult.success) {
        setItems(reloadResult.data.map(item => dbItemToSidebarItem(item, ROOT_ID)));
      }
    }
  }, [ROOT_ID, items, project.id]);

  const handleAdd = useCallback(async (parentId: string, type: SidebarItemType) => {
    // Convert ROOT_ID to null for database
    const dbParentId = uiParentIdToDb(parentId, ROOT_ID);
    
    const result = await itemService.create(
      project.id, 
      dbParentId, 
      type === 'folder' ? 'New Folder' : 'New File', 
      type
    );
    
    if (!result.success) {
      setError(result.error);
      return;
    }

    const newItem = dbItemToSidebarItem(result.data as any, ROOT_ID);
    setItems(prev => [...prev, newItem]);
    setEditingId(newItem.id);
    setEditName(newItem.name);
  }, [project.id, ROOT_ID]);

  const actions: ItemActions = useMemo(() => ({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onAdd: handleAdd,
  }), [handleEdit, handleDelete, handleAdd]);

  const renderItem = useCallback((item: SidebarItemData, depth: number) => {
    const children = items.filter(i => i.parentId === item.id).sort((a, b) => a.order - b.order);
    const isRoot = item.id === ROOT_ID;
    return (
      <SidebarItem
        key={item.id}
        item={item}
        children={children}
        allItems={items}
        depth={depth}
        onDrop={handleDrop}
        renderItem={renderItem}
        actions={actions}
        isRoot={isRoot}
      />
    );
  }, [items, handleDrop, actions, ROOT_ID]);

  const rootItem: SidebarItemData = useMemo(() => ({
    id: ROOT_ID,
    name: project.name,
    type: 'folder',
    parentId: null,
    order: 0,
    createdAt: project.createdAt,
    updatedAt: project.createdAt,
  }), [ROOT_ID, project]);

  // Root children have parentId === ROOT_ID in UI
  const rootChildren = items.filter(i => i.parentId === ROOT_ID).sort((a, b) => a.order - b.order);

  if (loading) {
    return (
      <aside className={styles.sidebar}>
        <header className={styles.header}>
          <span className={styles.title}>{project.name}</span>
        </header>
        <div className={styles.loading}>Loading...</div>
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar} role="tree" aria-label="File explorer">
      <header className={styles.header}>
        <span className={styles.title}>{project.name}</span>
      </header>
      {error && <div className={styles.error}>{error}</div>}
      <nav className={styles.content}>
        <SidebarItem
          item={rootItem}
          children={rootChildren}
          allItems={items}
          depth={0}
          onDrop={handleDrop}
          renderItem={renderItem}
          actions={actions}
          isRoot={true}
        />
      </nav>

      {editingId && (
        <div className={styles.modal} onClick={() => setEditingId(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
              className={styles.input}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button onClick={() => setEditingId(null)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleSaveEdit} className={styles.saveBtn}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
