/**
 * Database types matching Supabase schema.
 * These types mirror the database structure for type-safe queries.
 */

/**
 * Item type enum matching database enum
 */
export type ItemType = 'file' | 'folder' | 'canvas';

/**
 * Subscription status enum
 */
export type SubscriptionStatus = 'free' | 'pro' | 'cancelled';

/**
 * User row from database
 */
export interface UserRow {
  id: string;
  email: string | null;
  subscription_status: SubscriptionStatus;
  polar_customer_id: string | null;
  polar_subscription_id: string | null;
  subscription_end_date: string | null;
  preferences: UserPreferences | null;
  created_at: string;
  updated_at: string;
}

/**
 * User preferences stored as JSONB
 */
export interface UserPreferences {
  fontSize?: number;
  lineHeight?: number;
  textColor?: string;
  autoExportEnabled?: boolean;
  autoExportIntervalMinutes?: number;
}

/**
 * Goal period type
 */
export type GoalPeriod = 'daily' | 'weekly' | 'total';

/**
 * Project row from database
 */
export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  word_count_goal: number | null;
  time_goal_minutes: number | null;
  goal_period: GoalPeriod;
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
  word_count_goal?: number | null;
  time_goal_minutes?: number | null;
  goal_period?: GoalPeriod;
  created_at?: string;
  updated_at?: string;
}

/**
 * Project update payload
 */
export interface ProjectUpdate {
  name?: string;
  word_count_goal?: number | null;
  time_goal_minutes?: number | null;
  goal_period?: GoalPeriod;
  updated_at?: string;
}

/**
 * Goal progress row from database
 */
export interface GoalProgressRow {
  id: string;
  project_id: string;
  date: string;
  words_written: number;
  time_spent_minutes: number;
  created_at: string;
  updated_at: string;
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
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
  content?: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

/**
 * Item update payload
 */
export interface ItemUpdate {
  parent_id?: string | null;
  name?: string;
  content?: string;
  sort_order?: number;
  updated_at?: string;
  deleted_at?: string | null;
}

/**
 * Item with path (from view)
 */
export interface ItemWithPath extends ItemRow {
  path: string;
  depth: number;
}

import type { VersionRow, VersionInsert } from '@/types/version';

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
        Relationships: [];
      };
      items: {
        Row: ItemRow;
        Insert: ItemInsert;
        Update: ItemUpdate;
        Relationships: [];
      };
      users: {
        Row: UserRow;
        Insert: Partial<UserRow> & { id: string };
        Update: Partial<UserRow>;
        Relationships: [];
      };
      item_versions: {
        Row: VersionRow;
        Insert: VersionInsert;
        Update: Partial<VersionRow>;
        Relationships: [];
      };
    };
    Views: {
      items_with_path: {
        Row: ItemWithPath;
        Insert: never;
        Update: never;
        Relationships: [];
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
      soft_delete_item: {
        Args: { item_id: string };
        Returns: void;
      };
      restore_item: {
        Args: { item_id: string };
        Returns: void;
      };
      cleanup_old_trash_items: {
        Args: Record<string, never>;
        Returns: number;
      };
      create_item_version: {
        Args: { p_item_id: string; p_content: string; p_word_count?: number };
        Returns: string | null;
      };
      get_next_version_number: {
        Args: { p_item_id: string };
        Returns: number;
      };
      cleanup_old_versions: {
        Args: { p_keep_count?: number };
        Returns: number;
      };
    };
    Enums: {
      item_type: ItemType;
    };
  };
}


