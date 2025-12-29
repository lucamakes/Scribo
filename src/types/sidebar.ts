/**
 * Represents a file or folder item in the sidebar.
 * Structure mirrors typical database schema with foreign key relationships.
 */
export type SidebarItemType = 'file' | 'folder';

export interface SidebarItem {
  /** Unique identifier (UUID-like for database realism) */
  readonly id: string;
  /** Display name of the file or folder */
  name: string;
  /** Type discriminator */
  type: SidebarItemType;
  /** Parent folder ID. Null means root level. */
  parentId: string | null;
  /** Sort order within parent */
  order: number;
  /** Creation timestamp */
  readonly createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Drop position relative to target element
 */
export type DropPosition = 'before' | 'after' | 'inside';

/**
 * Drag data transferred during drag operations
 */
export interface DragData {
  itemId: string;
  itemType: SidebarItemType;
}

/**
 * Callbacks for item actions
 */
export interface ItemActions {
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (parentId: string, type: SidebarItemType) => void;
}

