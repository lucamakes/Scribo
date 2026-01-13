'use client';

import { useCallback, useMemo } from 'react';
import { Search, X, Folder, File, Layout } from 'lucide-react';
import type { SidebarItem as SidebarItemData } from '@/types/sidebar';
import { useSidebar } from '../SidebarContext';
import { SidebarItem } from '../SidebarItem/SidebarItem';
import styles from './SidebarSearch.module.css';

export function SidebarSearch() {
  const {
    project,
    items,
    rootId,
    selectedItemId,
    showSearch,
    setShowSearch,
    searchQuery,
    setSearchQuery,
    actions,
    handleDrop,
    editingId,
    editName,
    setEditName,
    saveEdit,
    cancelEdit,
  } = useSidebar();

  // All folders expanded for search
  const searchExpandedIds = useMemo(() => {
    const allFolderIds = new Set([rootId]);
    items.forEach(item => {
      if (item.type === 'folder') {
        allFolderIds.add(item.id);
      }
    });
    return allFolderIds;
  }, [items, rootId]);

  const toggleSearchExpanded = useCallback(() => {}, []);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return items
      .filter(item => item.id !== rootId)
      .map(item => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const content = (item.type === 'file') && 'content' in item ? (item.content || '') : '';
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
  }, [items, searchQuery, rootId]);

  // Search actions - closes modal on select
  const searchActions = useMemo(() => ({
    onEdit: actions.onEdit,
    onDelete: actions.onDelete,
    onAdd: actions.onAdd,
    onSelect: (item: SidebarItemData) => {
      actions.onSelect(item);
      setShowSearch(false);
      setSearchQuery('');
    },
  }), [actions, setShowSearch, setSearchQuery]);

  const renderSearchItem = useCallback((item: SidebarItemData, depth: number) => {
    const children = items.filter(i => i.parentId === item.id).sort((a, b) => a.order - b.order);
    const isRoot = item.id === rootId;
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
        onSaveEdit={saveEdit}
        onCancelEdit={cancelEdit}
      />
    );
  }, [items, handleDrop, searchActions, rootId, selectedItemId, searchExpandedIds, toggleSearchExpanded, editingId, editName, setEditName, saveEdit, cancelEdit]);

  const rootItem: SidebarItemData = useMemo(() => ({
    id: rootId,
    name: project.name,
    type: 'folder',
    parentId: null,
    content: '',
    order: 0,
    createdAt: project.createdAt,
    updatedAt: project.createdAt,
  }), [rootId, project]);

  const rootChildren = items.filter(i => i.parentId === rootId).sort((a, b) => a.order - b.order);

  const getPath = useCallback((itemId: string): string => {
    const currentItem = items.find(i => i.id === itemId);
    if (!currentItem || currentItem.parentId === rootId) return '';
    const parent = items.find(i => i.id === currentItem.parentId);
    if (!parent) return '';
    const parentPath = getPath(parent.id);
    return parentPath ? `${parentPath} / ${parent.name}` : parent.name;
  }, [items, rootId]);

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
  };

  if (!showSearch) return null;

  return (
    <div className={styles.searchModal} onClick={closeSearch}>
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
            <button
              onClick={() => setSearchQuery('')}
              className={styles.clearButton}
              aria-label="Clear search"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={closeSearch}
            className={styles.closeButton}
            aria-label="Close search"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        
        <div className={styles.searchResultsContainer}>
          {searchQuery ? (
            <div className={styles.searchResults}>
              {filteredItems.length > 0 ? (
                filteredItems.map(({ item, snippet }) => (
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
                ))
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
                isExpanded={searchExpandedIds.has(rootId)}
                onToggleExpand={toggleSearchExpanded}
              />
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
