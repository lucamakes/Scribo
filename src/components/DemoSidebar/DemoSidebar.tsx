'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDemo } from '@/lib/context/DemoContext';
import type { SidebarItem as SidebarItemData, SidebarItemType, ItemActions, DropPosition } from '@/types/sidebar';
import { SidebarItem } from '@/components/Sidebar/SidebarItem/SidebarItem';
import { Telescope, LogIn, Search, X, Folder, File, Layout } from 'lucide-react';
import styles from '@/components/Sidebar/Sidebar.module.css';

interface DemoSidebarProps {
  selectedItemId: string | null;
  onSelectItem: (item: SidebarItemData | null) => void;
  onToggleConstellation?: () => void;
  onSignUp?: () => void;
}

const ROOT_ID = 'demo-project';

function getChildren(items: SidebarItemData[], parentId: string | null): SidebarItemData[] {
  return items.filter(i => i.parentId === parentId).sort((a, b) => a.order - b.order);
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

export function DemoSidebar({ selectedItemId, onSelectItem, onToggleConstellation, onSignUp }: DemoSidebarProps) {
  const { project, items: rawItems, createItem, updateItem, deleteItem } = useDemo();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([ROOT_ID]));
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Convert items to SidebarItem format
  const items: SidebarItemData[] = useMemo(() => {
    return rawItems.map(item => {
      const baseItem = {
        id: item.id,
        name: item.name,
        parentId: item.parent_id === null ? ROOT_ID : item.parent_id,
        order: item.sort_order,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
      
      if (item.type === 'file') {
        return { ...baseItem, type: 'file' as const, content: item.content };
      } else if (item.type === 'canvas') {
        return { ...baseItem, type: 'canvas' as const, content: item.content || '{"nodes":[],"connections":[]}' };
      } else {
        return { ...baseItem, type: 'folder' as const, content: item.content };
      }
    });
  }, [rawItems]);

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

  // Filter items for search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return items
      .filter(item => item.id !== ROOT_ID)
      .map(item => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const content = (item.type === 'file') ? (item.content || '') : '';
        const contentMatch = content.toLowerCase().includes(query);
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
  }, [items, searchQuery]);

  const handleDrop = useCallback((draggedId: string, targetId: string, position: DropPosition) => {
    const draggedItem = items.find(i => i.id === draggedId);
    const targetItem = items.find(i => i.id === targetId);
    if (!draggedItem || !targetItem) return;
    if (wouldCreateCycle(items, draggedId, targetId)) return;

    let newParentId: string | null;
    let newOrder: number;

    if (position === 'inside') {
      if (targetItem.type !== 'folder') return;
      newParentId = targetId === ROOT_ID ? null : targetId;
      newOrder = getChildren(items, targetId).length;
    } else {
      newParentId = targetItem.parentId === ROOT_ID ? null : targetItem.parentId;
      newOrder = position === 'before' ? targetItem.order : targetItem.order + 1;
    }

    updateItem(draggedId, { 
      parent_id: newParentId, 
      sort_order: newOrder 
    });
  }, [items, updateItem]);

  const handleEdit = useCallback((id: string) => {
    if (id === ROOT_ID) return;
    const item = items.find(i => i.id === id);
    if (item) {
      setEditingId(id);
      setEditName(item.name);
    }
  }, [items]);

  const handleSaveEdit = useCallback(() => {
    if (!editingId || !editName.trim()) return;
    updateItem(editingId, { name: editName.trim() });
    setEditingId(null);
    setEditName('');
  }, [editingId, editName, updateItem]);

  const handleDelete = useCallback((id: string) => {
    if (id === ROOT_ID) return;
    deleteItem(id);
  }, [deleteItem]);

  const handleAdd = useCallback((parentId: string, type: SidebarItemType) => {
    const dbParentId = parentId === ROOT_ID ? null : parentId;
    const defaultName = type === 'folder' ? 'New Folder' : type === 'canvas' ? 'New Canvas' : 'New File';
    const newItem = createItem(dbParentId, defaultName, type);
    
    if (!expandedIds.has(parentId)) {
      setExpandedIds(prev => new Set([...prev, parentId]));
    }
    
    setEditingId(newItem.id);
    setEditName(newItem.name);
  }, [createItem, expandedIds]);

  const handleSelect = useCallback((item: SidebarItemData) => {
    onSelectItem(item);
  }, [onSelectItem]);

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
  }, [items, handleDrop, actions, selectedItemId, expandedIds, toggleExpanded, editingId, editName, handleSaveEdit]);

  const rootItem: SidebarItemData = useMemo(() => ({
    id: ROOT_ID,
    name: project.name,
    type: 'folder',
    parentId: null,
    content: '',
    order: 0,
    createdAt: project.created_at,
    updatedAt: project.created_at,
  }), [project]);

  const rootChildren = items.filter(i => i.parentId === ROOT_ID).sort((a, b) => a.order - b.order);

  // Calculate sidebar width based on depth
  const maxDepth = useMemo(() => {
    const getVisibleMaxDepth = (itemId: string, currentDepth: number): number => {
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
  }, [items, expandedIds]);

  const sidebarWidth = useMemo(() => {
    const baseWidth = 260;
    const widthPerLevel = 24;
    return Math.min(baseWidth + (maxDepth * widthPerLevel), 500);
  }, [maxDepth]);

  return (
    <aside className={styles.sidebar} style={{ width: `${sidebarWidth}px` }} role="tree" aria-label="File explorer">
      <header className={styles.header}>
        <span className={styles.title}>{project.name}</span>
        <div className={styles.headerActions}>
          {onToggleConstellation && (
            <button
              onClick={onToggleConstellation}
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
            title="Search" 
            aria-label="Search"
            onClick={() => setShowSearch(prev => !prev)}
          >
            <Search size={16} strokeWidth={1} />
          </button>
        </div>
      </header>

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

      {/* Demo banner */}
      <div className={styles.trashButton}>
        <button onClick={onSignUp} className={styles.trashBtn} title="Sign up to save your work">
          <LogIn size={18} strokeWidth={1} />
        </button>
      </div>

      {showSearch && (
        <div className={styles.searchModal} onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
          <div className={styles.searchModalContent} onClick={(e) => e.stopPropagation()}>
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
                <button onClick={() => setSearchQuery('')} className={styles.clearButton} aria-label="Clear search">
                  <X size={16} strokeWidth={1.5} />
                </button>
              )}
            </div>
            
            <div className={styles.searchResultsContainer}>
              {searchQuery ? (
                <div className={styles.searchResults}>
                  {filteredItems.length > 0 ? (
                    filteredItems.map(({ item, snippet }) => {
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
                            if (item.type === 'file' || item.type === 'canvas') {
                              actions.onSelect(item);
                              setShowSearch(false);
                              setSearchQuery('');
                            }
                          }}
                        >
                          <div className={`${styles.resultIcon} ${item.type === 'folder' ? styles.resultFolderIcon : styles.resultFileIcon}`}>
                            {item.type === 'folder' ? (
                              <Folder size={18} strokeWidth={1} fill="currentColor" fillOpacity={0.15} />
                            ) : item.type === 'canvas' ? (
                              <Layout size={18} strokeWidth={1} fill="currentColor" fillOpacity={0.15} />
                            ) : (
                              <File size={18} strokeWidth={1} fill="currentColor" fillOpacity={0.15} />
                            )}
                          </div>
                          <div className={styles.resultInfo}>
                            <div className={styles.resultName}>{item.name}</div>
                            <div className={styles.resultPath}>{getPath(item.id) || project.name}</div>
                            {snippet && <div className={styles.resultSnippet}>{snippet}</div>}
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
