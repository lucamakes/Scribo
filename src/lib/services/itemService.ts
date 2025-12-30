import { supabase } from '@/lib/supabase';
import type { ItemRow, ItemInsert, ItemUpdate, ItemType } from '@/types/database';

/**
 * Result type for service operations
 */
type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Service for item (file/folder) database operations.
 */
export const itemService = {
  /**
   * Get all items for a project (excluding deleted items).
   */
  async getByProject(projectId: string): Promise<ServiceResult<ItemRow[]>> {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Get direct children of a parent (or root items if parentId is null).
   * Excludes deleted items.
   */
  async getChildren(projectId: string, parentId: string | null): Promise<ServiceResult<ItemRow[]>> {
    let query = supabase
      .from('items')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Create a new item (file or folder).
   */
  async create(
    projectId: string,
    parentId: string | null,
    name: string,
    type: ItemType
  ): Promise<ServiceResult<ItemRow>> {
    // Get next sort order (only from non-deleted items)
    let query = supabase
      .from('items')
      .select('sort_order')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: false })
      .limit(1);

    if (parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentId);
    }

    const { data: siblings } = await query;
    // Type assertion needed because Supabase partial select types can be tricky
    type SortOrderResult = Array<{ sort_order: number }> | null;
    const typedSiblings = siblings as SortOrderResult;
    const sortOrder = typedSiblings && typedSiblings.length > 0 
      ? typedSiblings[0].sort_order + 1 
      : 0;

    const item: ItemInsert = {
      project_id: projectId,
      parent_id: parentId,
      name,
      type,
      sort_order: sortOrder,
    };

    // @ts-expect-error - Supabase type inference issue with Database type
    const { data, error } = await supabase
      .from('items')
      .insert(item)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Update an item's name.
   */
  async rename(id: string, name: string): Promise<ServiceResult<ItemRow>> {
    // @ts-expect-error - Supabase type inference issue with Database type
    const { data, error } = await supabase
      .from('items')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Move an item to a new parent at a specific position.
   * Also updates sibling sort orders to make room.
   */
  async move(
    id: string,
    newParentId: string | null,
    projectId: string,
    sortOrder: number
  ): Promise<ServiceResult<ItemRow>> {
    // First, shift siblings at or after the target position
    let shiftQuery = supabase
      .from('items')
      .select('id, sort_order')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .neq('id', id)
      .gte('sort_order', sortOrder);

    if (newParentId === null) {
      shiftQuery = shiftQuery.is('parent_id', null);
    } else {
      shiftQuery = shiftQuery.eq('parent_id', newParentId);
    }

    const { data: toShift } = await shiftQuery;

    // Shift each sibling's order by 1
    // Type assertion needed because Supabase partial select types can be tricky
    type ShiftItem = { id: string; sort_order: number };
    const typedToShift = toShift as ShiftItem[] | null;
    if (typedToShift && typedToShift.length > 0) {
      for (const item of typedToShift) {
        // @ts-expect-error - Supabase type inference issue with Database type
        await supabase
          .from('items')
          .update({ sort_order: item.sort_order + 1 })
          .eq('id', item.id);
      }
    }

    // Now update the moved item
    const updateData: ItemUpdate = {
      parent_id: newParentId,
      sort_order: sortOrder
    };

    // @ts-expect-error - Supabase type inference issue with Database type
    const { data, error } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Update sort order for an item.
   */
  async reorder(id: string, newOrder: number): Promise<ServiceResult<ItemRow>> {
    // @ts-expect-error - Supabase type inference issue with Database type
    const { data, error } = await supabase
      .from('items')
      .update({ sort_order: newOrder })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Soft delete an item (move to trash).
   * Sets deleted_at timestamp. Children are also marked as deleted.
   */
  async softDelete(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase.rpc('soft_delete_item', { item_id: id });

    if (error) {
      // Fallback if the function doesn't exist yet
      const now = new Date().toISOString();
      // @ts-expect-error - Supabase type inference issue with Database type
      const { error: updateError } = await supabase
        .from('items')
        .update({ deleted_at: now })
        .eq('id', id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    }
    return { success: true, data: null };
  },

  /**
   * Restore an item from trash.
   * Clears deleted_at timestamp. Children are also restored.
   */
  async restore(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase.rpc('restore_item', { item_id: id });

    if (error) {
      // Fallback if the function doesn't exist yet
      // @ts-expect-error - Supabase type inference issue with Database type
      const { error: updateError } = await supabase
        .from('items')
        .update({ deleted_at: null })
        .eq('id', id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    }
    return { success: true, data: null };
  },

  /**
   * Permanently delete an item (bypass trash).
   */
  async permanentDelete(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: null };
  },

  /**
   * Get all items in trash for a project.
   */
  async getTrash(projectId: string): Promise<ServiceResult<ItemRow[]>> {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('project_id', projectId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Empty the trash (permanently delete all trashed items for a project).
   */
  async emptyTrash(projectId: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('project_id', projectId)
      .not('deleted_at', 'is', null);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: null };
  },

  /**
   * Cleanup old trash items (older than 14 days).
   * This should be called periodically.
   */
  async cleanupOldTrash(): Promise<ServiceResult<number>> {
    const { data, error } = await supabase.rpc('cleanup_old_trash_items');

    if (error) {
      // Fallback if the function doesn't exist
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .not('deleted_at', 'is', null)
        .lt('deleted_at', fourteenDaysAgo.toISOString());

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }
      return { success: true, data: 0 }; // Can't get count in fallback
    }
    return { success: true, data: data ?? 0 };
  },

  /**
   * Batch update sort orders (for reordering multiple items).
   */
  async batchReorder(
    updates: Array<{ id: string; sort_order: number }>
  ): Promise<ServiceResult<null>> {
    for (const update of updates) {
      // @ts-expect-error - Supabase type inference issue with Database type
      const { error } = await supabase
        .from('items')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id);

      if (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: true, data: null };
  },

  /**
   * Get a single item by ID.
   */
  async getById(id: string): Promise<ServiceResult<ItemRow>> {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Update file content.
   */
  async updateContent(id: string, content: string): Promise<ServiceResult<ItemRow>> {
    // @ts-expect-error - Supabase type inference issue with Database type
    const { data, error } = await supabase
      .from('items')
      .update({ content })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },
};


