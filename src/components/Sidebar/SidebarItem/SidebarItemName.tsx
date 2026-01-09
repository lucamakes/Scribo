'use client';

import styles from './SidebarItem.module.css';

interface SidebarItemNameProps {
  name: string;
  isRoot?: boolean;
  isEditing: boolean;
  editName: string;
  onEditNameChange?: (name: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
}

export function SidebarItemName({
  name,
  isRoot,
  isEditing,
  editName,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
}: SidebarItemNameProps) {
  if (isEditing) {
    return (
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
    );
  }

  const displayName = name.length > 15 ? name.slice(0, 15) + '...' : name;

  return (
    <span className={`${styles.name} ${isRoot ? styles.rootName : ''}`}>
      {displayName}
    </span>
  );
}
