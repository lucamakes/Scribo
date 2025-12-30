/**
 * Represents a file or folder item in the sidebar.
 * Structure mirrors typical database schema with foreign key relationships.
 */
export type SidebarItemType = 'file' | 'folder';

/**
 * Base properties shared by both files and folders
 */
interface BaseSidebarItem {
  /** Unique identifier (UUID-like for database realism) */
  readonly id: string;
  /** Display name of the file or folder */
  name: string;
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
 * File item with required content
 */
interface FileSidebarItem extends BaseSidebarItem {
  type: 'file';
  /** File content */
  content: string;
}

/**
 * Folder item without content
 */
interface FolderSidebarItem extends BaseSidebarItem {
  type: 'folder';
  /** Folder content (optional, typically empty) */
  content?: string;
}

/**
 * Discriminated union for sidebar items
 */
export type SidebarItem = FileSidebarItem | FolderSidebarItem;

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
  onSelect: (item: SidebarItem) => void;
}

