'use client';

import { useCallback, useMemo } from 'react';
import type { SidebarItem as SidebarItemData } from '@/types/sidebar';
import { useSidebar } from '../SidebarContext';
import { SidebarItem } from '../SidebarItem/SidebarItem';
import styles from './SidebarContent.module.css';

export function SidebarContent() {
  const {
    project,
    items,
    rootId,
    selectedItemId,
    expandedIds,
    toggleExpanded,
    editingId,
    editName,
    setEditName,
    saveEdit,
    cancelEdit,
    actions,
    handleDrop,
  } = useSidebar();

  const renderItem = useCallback((item: SidebarItemData, depth: number) => {
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
        renderItem={renderItem}
        actions={actions}
        isRoot={isRoot}
        selectedItemId={selectedItemId}
        isExpanded={expandedIds.has(item.id)}
        onToggleExpand={toggleExpanded}
        editingId={editingId}
        editName={editName}
        onEditNameChange={setEditName}
        onSaveEdit={saveEdit}
        onCancelEdit={cancelEdit}
      />
    );
  }, [items, handleDrop, actions, rootId, selectedItemId, expandedIds, toggleExpanded, editingId, editName, setEditName, saveEdit, cancelEdit]);

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

  return (
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
        isExpanded={expandedIds.has(rootId)}
        onToggleExpand={toggleExpanded}
      />
    </nav>
  );
}
