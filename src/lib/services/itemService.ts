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
   * Get all items for a project.
   */
  async getByProject(projectId: string): Promise<ServiceResult<ItemRow[]>> {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Get direct children of a parent (or root items if parentId is null).
   */
  async getChildren(projectId: string, parentId: string | null): Promise<ServiceResult<ItemRow[]>> {
    let query = supabase
      .from('items')
      .select('*')
      .eq('project_id', projectId)
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
    // Get next sort order
    let query = supabase
      .from('items')
      .select('sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: false })
      .limit(1);

    if (parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentId);
    }

    const { data: siblings } = await query;
    const sortOrder = siblings && siblings.length > 0 ? siblings[0].sort_order + 1 : 0;

    const item: ItemInsert = {
      project_id: projectId,
      parent_id: parentId,
      name,
      type,
      sort_order: sortOrder,
    };

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
      .neq('id', id)
      .gte('sort_order', sortOrder);

    if (newParentId === null) {
      shiftQuery = shiftQuery.is('parent_id', null);
    } else {
      shiftQuery = shiftQuery.eq('parent_id', newParentId);
    }

    const { data: toShift } = await shiftQuery;
    
    // Shift each sibling's order by 1
    if (toShift && toShift.length > 0) {
      for (const item of toShift) {
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
   * Delete an item (and all children if folder, via cascade).
   */
  async delete(id: string): Promise<ServiceResult<null>> {
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
   * Batch update sort orders (for reordering multiple items).
   */
  async batchReorder(
    updates: Array<{ id: string; sort_order: number }>
  ): Promise<ServiceResult<null>> {
    // Supabase doesn't support batch updates natively, so we use a transaction-like approach
    for (const update of updates) {
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

