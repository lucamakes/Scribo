'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SidebarItem as SidebarItemData, DropPosition, SidebarItemType, ItemActions } from '@/types/sidebar';
import type { Project } from '@/types/project';
import { itemService } from '@/lib/services/itemService';
import { SidebarItem } from './SidebarItem/SidebarItem';
import { TrashPanel } from '@/components/TrashPanel/TrashPanel';
import { ExportModal } from '@/components/ExportModal/ExportModal';
import styles from './Sidebar.module.css';
import { Telescope, Trash2, ArrowLeft, Download, Search, X, Folder, File } from 'lucide-react';




interface SidebarProps {
  project: Project;
  selectedItemId: string | null;
  onSelectItem: (item: SidebarItemData | null) => void;
  onToggleBlankView?: () => void;
  onBackToProjects?: () => void;
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
  dbItem: { id: string; name: string; type: 'file' | 'folder'; parent_id: string | null; content: string; sort_order: number; created_at: string; updated_at: string },
  rootId: string
): SidebarItemData {
  const baseItem = {
    id: dbItem.id,
    name: dbItem.name,
    type: dbItem.type,
    // Map null to ROOT_ID for UI (root-level items appear under project folder)
    parentId: dbItem.parent_id === null ? rootId : dbItem.parent_id,
    order: dbItem.sort_order,
    createdAt: dbItem.created_at,
    updatedAt: dbItem.updated_at,
  };

  // Use discriminated union: files require content, folders have optional content
  if (dbItem.type === 'file') {
    return {
      ...baseItem,
      type: 'file',
      content: dbItem.content ?? '',
    };
  } else {
    return {
      ...baseItem,
      type: 'folder',
      ...(dbItem.content ? { content: dbItem.content } : {}),
    };
  }
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
export function Sidebar({ project, selectedItemId, onSelectItem, onToggleBlankView, onBackToProjects }: SidebarProps) {
  const ROOT_ID = project.id;

  const [items, setItems] = useState<SidebarItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([ROOT_ID])); // Track expanded folders for main sidebar
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false); // Closed by default

  // Expand all folders for search modal sidebar
  const searchExpandedIds = useMemo(() => {
    const allFolderIds = new Set([ROOT_ID]);
    items.forEach(item => {
      if (item.type === 'folder') {
        allFolderIds.add(item.id);
      }
    });
    return allFolderIds;
  }, [items, ROOT_ID]);

  // No-op toggle for search modal (always expanded)
  const toggleSearchExpanded = useCallback(() => {}, []);

  // Toggle folder expansion for main sidebar
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

  // Filter items based on search query - include content matches
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return items
      .filter(item => item.id !== ROOT_ID)
      .map(item => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const content = item.type === 'file' && 'content' in item ? (item.content || '') : '';
        const contentMatch = content.toLowerCase().includes(query);
        
        // Get content snippet around the match
        let snippet = '';
        if (contentMatch && content) {
          const index = content.toLowerCase().indexOf(query);
          const start = Math.max(0, index - 30);
          const end = Math.min(content.length, index + query.length + 50);
          snippet = (start > 0 ? '...' : '') + content.slice(start, end).trim() + (end < content.length ? '...' : '');
        }
        
        return { item, nameMatch, contentMatch, snippet };
      })
      .filter(({ nameMatch, contentMatch }) => nameMatch || contentMatch);
  }, [items, searchQuery, ROOT_ID]);

  // Load items from database
  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      setError(null);
      const result = await itemService.getByProject(project.id);

      if (!result.success) {
        setError((result as { success: false; error: string }).error);
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
      setError((moveResult as { success: false; error: string }).error);
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
      setError((result as { success: false; error: string }).error);
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

    // Optimistic update - remove from view
    setItems(prev => prev.filter(i => !idsToDelete.has(i.id)));

    // Soft delete (move to trash) instead of permanent delete
    const result = await itemService.softDelete(id);
    if (!result.success) {
      setError((result as { success: false; error: string }).error);
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
      setError((result as { success: false; error: string }).error);
      return;
    }

    const newItem = dbItemToSidebarItem(result.data as any, ROOT_ID);
    setItems(prev => [...prev, newItem]);
    
    // Expand the parent folder if it's not already expanded
    if (!expandedIds.has(parentId)) {
      setExpandedIds(prev => new Set([...prev, parentId]));
    }
    
    setEditingId(newItem.id);
    setEditName(newItem.name);
  }, [project.id, ROOT_ID, expandedIds]);



  const handleSelect = useCallback(async (item: SidebarItemData) => {
    // For files, fetch fresh content from database to ensure we have latest saved content
    if (item.type === 'file') {
      const result = await itemService.getById(item.id);
      if (result.success) {
        const freshItem = dbItemToSidebarItem(result.data as any, ROOT_ID);
        // Update local state with fresh content
        setItems(prev => prev.map(i => i.id === item.id ? freshItem : i));
        onSelectItem(freshItem);
        return;
      }
    }
    onSelectItem(item);
  }, [onSelectItem, ROOT_ID]);

  const actions: ItemActions = useMemo(() => ({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onAdd: handleAdd,
    onSelect: handleSelect,
  }), [handleEdit, handleDelete, handleAdd, handleSelect]);

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
        selectedItemId={selectedItemId}
        isExpanded={expandedIds.has(item.id)}
        onToggleExpand={toggleExpanded}
        editingId={editingId}
        editName={editName}
        onEditNameChange={setEditName}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={() => setEditingId(null)}
      />
    );
  }, [items, handleDrop, actions, ROOT_ID, selectedItemId, expandedIds, toggleExpanded, editingId, editName, handleSaveEdit]);

  // Actions for search modal sidebar - closes modal on select
  const searchActions: ItemActions = useMemo(() => ({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onAdd: handleAdd,
    onSelect: (item: SidebarItemData) => {
      handleSelect(item);
      setShowSearch(false);
      setSearchQuery('');
    },
  }), [handleEdit, handleDelete, handleAdd, handleSelect]);

  // Render item for search modal sidebar
  const renderSearchItem = useCallback((item: SidebarItemData, depth: number) => {
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
        renderItem={renderSearchItem}
        actions={searchActions}
        isRoot={isRoot}
        selectedItemId={selectedItemId}
        isExpanded={searchExpandedIds.has(item.id)}
        onToggleExpand={toggleSearchExpanded}
        editingId={editingId}
        editName={editName}
        onEditNameChange={setEditName}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={() => setEditingId(null)}
      />
    );
  }, [items, handleDrop, searchActions, ROOT_ID, selectedItemId, searchExpandedIds, toggleSearchExpanded, editingId, editName, handleSaveEdit]);

  const rootItem: SidebarItemData = useMemo(() => ({
    id: ROOT_ID,
    name: project.name,
    type: 'folder',
    parentId: null,
    content: '',
    order: 0,
    createdAt: project.createdAt,
    updatedAt: project.createdAt,
  }), [ROOT_ID, project]);

  // Root children have parentId === ROOT_ID in UI
  const rootChildren = items.filter(i => i.parentId === ROOT_ID).sort((a, b) => a.order - b.order);

  // Calculate max VISIBLE depth based on expanded folders
  const maxDepth = useMemo(() => {
    const getVisibleMaxDepth = (itemId: string, currentDepth: number): number => {
      // If this folder is not expanded, don't count its children
      if (!expandedIds.has(itemId)) return currentDepth;
      
      const children = items.filter(i => i.parentId === itemId);
      if (children.length === 0) return currentDepth;
      
      return Math.max(...children.map(child => {
        if (child.type === 'folder') {
          return getVisibleMaxDepth(child.id, currentDepth + 1);
        }
        return currentDepth + 1;
      }));
    };
    return getVisibleMaxDepth(ROOT_ID, 0);
  }, [items, ROOT_ID, expandedIds]);

  // Calculate dynamic width: base width + additional width per nesting level
  const sidebarWidth = useMemo(() => {
    const baseWidth = 260;
    const widthPerLevel = 24; // matches the margin-left in .children
    return Math.min(baseWidth + (maxDepth * widthPerLevel), 500); // cap at 500px
  }, [maxDepth]);

  if (loading) {
    return (
      <aside className={styles.sidebar} style={{ width: `${sidebarWidth}px` }}>
        <header className={styles.header}>
          <span className={styles.title}>{project.name}</span>
        </header>
        <div className={styles.loading}>Loading...</div>
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar} style={{ width: `${sidebarWidth}px` }} role="tree" aria-label="File explorer">
      <header className={styles.header}>
        <span className={styles.title}>{project.name}</span>
        <div className={styles.headerActions}>
          {onBackToProjects && (
            <button
              onClick={onBackToProjects}
              className={styles.blankIconButton}
              type="button"
              aria-label="Back to projects"
              title="Back to Projects"
            >
              <ArrowLeft size={18} strokeWidth={1} />
            </button>
          )}
          {onToggleBlankView && (
            <button
              onClick={onToggleBlankView}
              className={styles.blankIconButton}
              type="button"
              aria-label="Show constellation view"
              title="Constellation View"
            >
              <Telescope size={18} strokeWidth={1} />
            </button>
          )}
          <div className={styles.divider}></div>
          <button 
            className={styles.blankIconButton} 
            title="Export" 
            aria-label="Export"
            onClick={() => setShowExport(true)}
          >
            <Download size={16} strokeWidth={1} />
          </button>
          <button 
            className={styles.blankIconButton} 
            title="Search" 
            aria-label="Search"
            onClick={() => setShowSearch(prev => !prev)}
          >
            <Search size={16} strokeWidth={1} />
          </button>
        </div>
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
          selectedItemId={selectedItemId}
          isExpanded={expandedIds.has(ROOT_ID)}
          onToggleExpand={toggleExpanded}
        />
      </nav>

      <div className={styles.trashButton}>
        <button onClick={() => setShowTrash(true)} className={styles.trashBtn} title="Trash">
          <Trash2 size={18} strokeWidth={1} />
        </button>
      </div>

      <TrashPanel
        projectId={project.id}
        isOpen={showTrash}
        onClose={() => setShowTrash(false)}
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        projectName={project.name}
        projectId={project.id}
      />

      {showSearch && (
        <div className={styles.searchModal} onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
          <div 
            className={styles.searchModalContent} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.searchInputWrapper}>
              <Search size={18} strokeWidth={1.5} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={styles.clearButton}
                  aria-label="Clear search"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              )}
            </div>
            
            <div className={styles.searchResultsContainer}>
              {searchQuery ? (
                <div className={styles.searchResults}>
                  {filteredItems.length > 0 ? (
                    filteredItems.map(({ item, snippet }) => {
                      // Get path to item
                      const getPath = (itemId: string): string => {
                        const currentItem = items.find(i => i.id === itemId);
                        if (!currentItem || currentItem.parentId === ROOT_ID) return '';
                        const parent = items.find(i => i.id === currentItem.parentId);
                        if (!parent) return '';
                        const parentPath = getPath(parent.id);
                        return parentPath ? `${parentPath} / ${parent.name}` : parent.name;
                      };

                      return (
                        <div
                          key={item.id}
                          className={styles.searchResultItem}
                          onClick={() => {
                            if (item.type === 'file') {
                              actions.onSelect(item);
                              setShowSearch(false);
                              setSearchQuery('');
                            }
                          }}
                        >
                          <div className={`${styles.resultIcon} ${item.type === 'folder' ? styles.resultFolderIcon : styles.resultFileIcon}`}>
                            {item.type === 'folder' ? (
                              <Folder size={18} strokeWidth={1} fill="currentColor" fillOpacity={0.15} />
                            ) : (
                              <File size={18} strokeWidth={1} fill="currentColor" fillOpacity={0.15} />
                            )}
                          </div>
                          <div className={styles.resultInfo}>
                            <div className={styles.resultName}>{item.name}</div>
                            <div className={styles.resultPath}>
                              {getPath(item.id) || project.name}
                            </div>
                            {snippet && (
                              <div className={styles.resultSnippet}>{snippet}</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.noResults}>No results found</div>
                  )}
                </div>
              ) : (
                <div className={styles.searchPlaceholder}>
                  <Search size={48} strokeWidth={1} className={styles.placeholderIcon} />
                  <div className={styles.placeholderText}>Start typing to search</div>
                  <div className={styles.placeholderSubtext}>Search through all your files and folders</div>
                </div>
              )}
              
              <div className={styles.miniSidebar}>
                <nav className={styles.miniSidebarContent}>
                  <SidebarItem
                    item={rootItem}
                    children={rootChildren}
                    allItems={items}
                    depth={0}
                    onDrop={handleDrop}
                    renderItem={renderSearchItem}
                    actions={searchActions}
                    isRoot={true}
                    selectedItemId={selectedItemId}
                    isExpanded={searchExpandedIds.has(ROOT_ID)}
                    onToggleExpand={toggleSearchExpanded}
                  />
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
