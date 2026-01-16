'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import type { SidebarItem as SidebarItemData, DropPosition, SidebarItemType, ItemActions } from '@/types/sidebar';
import type { Project } from '@/types/project';
import { useDataService } from '@/lib/services/dataService';

// ============================================
// Types
// ============================================

interface SidebarContextValue {
  // Core data
  project: Project;
  items: SidebarItemData[];
  rootId: string;

  // Loading/error state
  loading: boolean;
  error: string | null;

  // Selection state
  selectedItemId: string | null;

  // Expansion state
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;

  // Edit state
  editingId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  startEditing: (id: string) => void;
  saveEdit: () => Promise<void>;
  cancelEdit: () => void;

  // Actions
  actions: ItemActions;
  handleDrop: (draggedId: string, targetId: string, position: DropPosition) => Promise<void>;

  // Modals
  showTrash: boolean;
  setShowTrash: (show: boolean) => void;
  showExport: boolean;
  setShowExport: (show: boolean) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  addModalParentId: string | null;
  setAddModalParentId: (parentId: string | null) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Reload
  reloadItems: () => Promise<void>;

  // Mode
  isDemo: boolean;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

// ============================================
// Utility Functions
// ============================================

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

function dbItemToSidebarItem(
  dbItem: { id: string; name: string; type: 'file' | 'folder' | 'canvas'; parent_id: string | null; content: string; sort_order: number; created_at: string; updated_at: string },
  rootId: string
): SidebarItemData {
  const baseItem = {
    id: dbItem.id,
    name: dbItem.name,
    type: dbItem.type,
    parentId: dbItem.parent_id === null ? rootId : dbItem.parent_id,
    order: dbItem.sort_order,
    createdAt: dbItem.created_at,
    updatedAt: dbItem.updated_at,
  };

  if (dbItem.type === 'file') {
    return { ...baseItem, type: 'file', content: dbItem.content ?? '' };
  } else if (dbItem.type === 'canvas') {
    return { ...baseItem, type: 'canvas', content: dbItem.content ?? '{"nodes":[],"connections":[]}' };
  } else {
    return { ...baseItem, type: 'folder', ...(dbItem.content ? { content: dbItem.content } : {}) };
  }
}

function uiParentIdToDb(parentId: string, rootId: string): string | null {
  return parentId === rootId ? null : parentId;
}

// ============================================
// Provider
// ============================================

interface SidebarProviderProps {
  children: ReactNode;
  project: Project;
  selectedItemId: string | null;
  onSelectItem: (item: SidebarItemData | null) => void;
}

export function SidebarProvider({ children, project, selectedItemId, onSelectItem }: SidebarProviderProps) {
  const ROOT_ID = project.id;
  const dataService = useDataService();

  // Core state
  const [items, setItems] = useState<SidebarItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([ROOT_ID]));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Modal state
  const [showTrash, setShowTrash] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [addModalParentId, setAddModalParentId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Load items
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await dataService.getItems(project.id);

    if (!result.success) {
      setError('error' in result ? result.error : 'Failed to load items');
      setLoading(false);
      return;
    }

    const sidebarItems = result.data.map(item => dbItemToSidebarItem(item, ROOT_ID));
    setItems(sidebarItems);
    setLoading(false);
  }, [project.id, ROOT_ID, dataService]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Expansion
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Editing
  const startEditing = useCallback((id: string) => {
    if (id === ROOT_ID) return;
    const item = items.find(i => i.id === id);
    if (item) {
      setEditingId(id);
      setEditName(item.name);
    }
  }, [items, ROOT_ID]);

  const saveEdit = useCallback(async () => {
    if (!editingId || !editName.trim()) return;

    const result = await dataService.renameItem(editingId, editName.trim());
    if (!result.success) {
      setError('error' in result ? result.error : 'Failed to rename item');
      return;
    }

    const updatedItem = dbItemToSidebarItem(result.data as any, ROOT_ID);
    setItems(prev => prev.map(item => item.id === editingId ? updatedItem : item));
    setEditingId(null);
    setEditName('');
  }, [editingId, editName, ROOT_ID, dataService]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditName('');
  }, []);

  // Delete
  const handleDelete = useCallback(async (id: string) => {
    if (id === ROOT_ID) return;

    const idsToDelete = new Set<string>();
    const collectChildren = (parentId: string) => {
      idsToDelete.add(parentId);
      items.filter(i => i.parentId === parentId).forEach(child => collectChildren(child.id));
    };
    collectChildren(id);

    setItems(prev => prev.filter(i => !idsToDelete.has(i.id)));

    const result = await dataService.softDelete(id);
    if (!result.success) {
      setError('error' in result ? result.error : 'Failed to delete item');
      // Reload to restore state
      loadItems();
    }
  }, [ROOT_ID, items, dataService, loadItems]);

  // Add
  const handleAdd = useCallback(async (parentId: string, type: SidebarItemType) => {
    const dbParentId = uiParentIdToDb(parentId, ROOT_ID);
    const defaultName = type === 'folder' ? 'New Folder' : type === 'canvas' ? 'New Canvas' : 'New File';

    const result = await dataService.createItem(project.id, dbParentId, defaultName, type);

    if (!result.success) {
      setError('error' in result ? result.error : 'Failed to create item');
      return;
    }

    const newItem = dbItemToSidebarItem(result.data as any, ROOT_ID);
    setItems(prev => [...prev, newItem]);

    if (!expandedIds.has(parentId)) {
      setExpandedIds(prev => new Set([...prev, parentId]));
    }

    setEditingId(newItem.id);
    setEditName(newItem.name);
  }, [project.id, ROOT_ID, expandedIds, dataService]);

  // Select
  const handleSelect = useCallback(async (item: SidebarItemData) => {
    if (item.type === 'file' || item.type === 'canvas') {
      const result = await dataService.getItem(item.id);
      if (result.success) {
        const freshItem = dbItemToSidebarItem(result.data as any, ROOT_ID);
        setItems(prev => prev.map(i => i.id === item.id ? freshItem : i));
        onSelectItem(freshItem);
        return;
      }
    }
    onSelectItem(item);
  }, [onSelectItem, ROOT_ID, dataService]);

  // Drop
  const handleDrop = useCallback(async (draggedId: string, targetId: string, position: DropPosition) => {
    const draggedItem = items.find(i => i.id === draggedId);
    const targetItem = items.find(i => i.id === targetId);
    if (!draggedItem || !targetItem) return;
    if (wouldCreateCycle(items, draggedId, targetId)) return;

    let uiParentId: string;
    if (position === 'inside') {
      if (targetItem.type !== 'folder') return;
      uiParentId = targetId;
    } else {
      uiParentId = targetItem.parentId ?? ROOT_ID;
    }

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

    const dbParentId = uiParentIdToDb(uiParentId, ROOT_ID);
    const finalItem = newItems.find(i => i.id === draggedId);
    const finalOrder = finalItem?.order ?? 0;

    const moveResult = await dataService.moveItem(draggedId, dbParentId, project.id, finalOrder);
    if (!moveResult.success) {
      setError('error' in moveResult ? moveResult.error : 'Failed to move item');
      loadItems();
    }
  }, [items, project.id, ROOT_ID, dataService, loadItems]);

  // Actions object
  const actions: ItemActions = useMemo(() => ({
    onEdit: startEditing,
    onDelete: handleDelete,
    onAdd: handleAdd,
    onSelect: handleSelect,
  }), [startEditing, handleDelete, handleAdd, handleSelect]);

  const value: SidebarContextValue = useMemo(() => ({
    project,
    items,
    rootId: ROOT_ID,
    loading,
    error,
    selectedItemId,
    expandedIds,
    toggleExpanded,
    editingId,
    editName,
    setEditName,
    startEditing,
    saveEdit,
    cancelEdit,
    actions,
    handleDrop,
    showTrash,
    setShowTrash,
    showExport,
    setShowExport,
    showSearch,
    setShowSearch,
    showMenu,
    setShowMenu,
    addModalParentId,
    setAddModalParentId,
    searchQuery,
    setSearchQuery,
    reloadItems: loadItems,
    isDemo: dataService.isDemo,
  }), [
    project, items, ROOT_ID, loading, error, selectedItemId,
    expandedIds, toggleExpanded, editingId, editName, startEditing,
    saveEdit, cancelEdit, actions, handleDrop, showTrash, showExport,
    showSearch, showMenu, addModalParentId, searchQuery, loadItems, dataService.isDemo
  ]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
