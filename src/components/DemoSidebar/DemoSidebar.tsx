'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDemo } from '@/lib/context/DemoContext';
import type { SidebarItem as SidebarItemData, SidebarItemType, ItemActions, DropPosition } from '@/types/sidebar';
import { SidebarItem } from '@/components/Sidebar/SidebarItem/SidebarItem';
import { Telescope, Trash2, Search, X, Folder, File, Layout, Download, Undo, MoreHorizontal } from 'lucide-react';
import styles from '@/components/Sidebar/SidebarShared.module.css';
import trashStyles from '@/components/TrashPanel/TrashPanel.module.css';

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

export function DemoSidebar({ selectedItemId, onSelectItem, onToggleConstellation }: DemoSidebarProps) {
  const { project, items: rawItems, createItem, updateItem, deleteItem, restoreItem, permanentDeleteItem, getTrashItems, emptyTrash } = useDemo();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([ROOT_ID]));
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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

  // Expand all folders for search modal sidebar
  const searchExpandedIds = useMemo(() => {
    const allFolderIds = new Set([ROOT_ID]);
    items.forEach(item => {
      if (item.type === 'folder') {
        allFolderIds.add(item.id);
      }
    });
    return allFolderIds;
  }, [items]);

  // No-op toggle for search modal (always expanded)
  const toggleSearchExpanded = useCallback(() => {}, []);

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
  }, [items, handleDrop, searchActions, selectedItemId, searchExpandedIds, toggleSearchExpanded, editingId, editName, handleSaveEdit]);

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

  // Trash items
  const trashItems = getTrashItems();

  const handleRestore = useCallback((id: string) => {
    restoreItem(id);
  }, [restoreItem]);

  const handlePermanentDelete = useCallback((id: string) => {
    permanentDeleteItem(id);
  }, [permanentDeleteItem]);

  const handleEmptyTrash = useCallback(() => {
    if (confirm('Are you sure you want to permanently delete all items in trash?')) {
      emptyTrash();
    }
  }, [emptyTrash]);

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
              aria-label="Constellation View"
              title="Constellation View"
            >
              <Telescope size={18} strokeWidth={1} />
            </button>
          )}
          <button 
            className={styles.blankIconButton} 
            title="Menu" 
            aria-label="Menu"
            onClick={() => setShowMenu(prev => !prev)}
          >
            <MoreHorizontal size={18} strokeWidth={1} />
          </button>
          
          {showMenu && (
            <div className={styles.menuDropdown}>
              <div className={styles.menuBackdrop} onClick={() => setShowMenu(false)} />
              <div className={styles.menuContent}>
                <button
                  onClick={() => { setShowSearch(true); setShowMenu(false); }}
                  className={styles.menuItem}
                >
                  <Search size={16} strokeWidth={1} />
                  <span>Search</span>
                </button>
                <button
                  className={styles.menuItem}
                  style={{ opacity: 0.4, cursor: 'not-allowed' }}
                  disabled
                  title="Sign up to export"
                >
                  <Download size={16} strokeWidth={1} />
                  <span>Export</span>
                </button>
                <button
                  onClick={() => { setShowTrash(true); setShowMenu(false); }}
                  className={styles.menuItem}
                >
                  <Trash2 size={16} strokeWidth={1} />
                  <span>Trash</span>
                </button>
              </div>
            </div>
          )}
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

      {/* Trash Panel */}
      {showTrash && (
        <div className={trashStyles.overlay} onClick={() => setShowTrash(false)}>
          <div className={trashStyles.panel} onClick={e => e.stopPropagation()}>
            <header className={trashStyles.header}>
              <div className={trashStyles.headerLeft}>
                <Trash2 size={20} strokeWidth={1} className={trashStyles.icon} />
                <h2 className={trashStyles.title}>Trash</h2>
              </div>
              <button onClick={() => setShowTrash(false)} className={trashStyles.closeButton}>
                <X size={20} strokeWidth={1} />
              </button>
            </header>

            <p className={trashStyles.subtitle}>
              Items in trash will be permanently deleted when you clear browser data
            </p>

            <div className={trashStyles.content}>
              {trashItems.length === 0 ? (
                <div className={trashStyles.empty}>
                  <Trash2 size={48} strokeWidth={1} className={trashStyles.emptyIcon} />
                  <p>Trash is empty</p>
                </div>
              ) : (
                <ul className={trashStyles.list}>
                  {trashItems.map(item => (
                    <li key={item.id} className={trashStyles.item}>
                      <div className={trashStyles.itemInfo}>
                        <span className={trashStyles.itemIcon}>
                          {item.type === 'folder'
                            ? <Folder size={16} strokeWidth={1} data-type="folder" />
                            : item.type === 'canvas'
                            ? <Layout size={16} strokeWidth={1} data-type="canvas" />
                            : <File size={16} strokeWidth={1} data-type="file" />
                          }
                        </span>
                        <span className={trashStyles.itemName}>{item.name}</span>
                      </div>
                      <div className={trashStyles.itemActions}>
                        <button
                          onClick={() => handleRestore(item.id)}
                          className={trashStyles.restoreButton}
                          title="Restore"
                        >
                          <Undo size={16} strokeWidth={1} />
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(item.id)}
                          className={trashStyles.deleteButton}
                          title="Delete permanently"
                        >
                          <X size={16} strokeWidth={1} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {trashItems.length > 0 && (
              <footer className={trashStyles.footer}>
                <button onClick={handleEmptyTrash} className={trashStyles.emptyButton}>
                  Empty Trash
                </button>
              </footer>
            )}
          </div>
        </div>
      )}

      {/* Search Modal */}
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
                              searchActions.onSelect(item);
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
