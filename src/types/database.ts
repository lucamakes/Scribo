/**
 * Database types matching Supabase schema.
 * These types mirror the database structure for type-safe queries.
 */

/**
 * Item type enum matching database enum
 */
export type ItemType = 'file' | 'folder';

/**
 * Project row from database
 */
export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Project insert payload
 */
export interface ProjectInsert {
  id?: string;
  user_id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Project update payload
 */
export interface ProjectUpdate {
  name?: string;
  updated_at?: string;
}

/**
 * Item row from database
 */
export interface ItemRow {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  type: ItemType;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Item insert payload
 */
export interface ItemInsert {
  id?: string;
  project_id: string;
  parent_id?: string | null;
  name: string;
  type: ItemType;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Item update payload
 */
export interface ItemUpdate {
  parent_id?: string | null;
  name?: string;
  sort_order?: number;
  updated_at?: string;
}

/**
 * Item with path (from view)
 */
export interface ItemWithPath extends ItemRow {
  path: string;
  depth: number;
}

/**
 * Database schema type for Supabase client
 */
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
      items: {
        Row: ItemRow;
        Insert: ItemInsert;
        Update: ItemUpdate;
      };
    };
    Views: {
      items_with_path: {
        Row: ItemWithPath;
      };
    };
    Functions: {
      get_next_sort_order: {
        Args: { p_project_id: string; p_parent_id: string | null };
        Returns: number;
      };
      check_circular_reference: {
        Args: { p_item_id: string; p_new_parent_id: string | null };
        Returns: boolean;
      };
    };
    Enums: {
      item_type: ItemType;
    };
  };
}

