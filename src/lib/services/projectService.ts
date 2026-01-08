import { supabase } from '@/lib/supabase';
import type { ProjectRow, ProjectInsert } from '@/types/database';

/**
 * Result type for service operations
 */
type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Service for project-related database operations.
 */
export const projectService = {
  /**
   * Get all projects for the current user.
   */
  async getAll(): Promise<ServiceResult<ProjectRow[]>> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Get a single project by ID.
   */
  async getById(id: string): Promise<ServiceResult<ProjectRow>> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Create a new project.
   */
  async create(project: ProjectInsert): Promise<ServiceResult<ProjectRow>> {
    // @ts-ignore - Supabase type inference issue with Database type
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Update a project name.
   * Note: Root folder name is immutable in the UI, but this exists for admin use.
   */
  async updateName(id: string, name: string): Promise<ServiceResult<ProjectRow>> {
    // @ts-ignore - Supabase type inference issue with Database type
    const { data, error } = await supabase
      .from('projects')
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
   * Delete a project and all its items (cascades).
   */
  async delete(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: null };
  },

  /**
   * Duplicate a project with all its items.
   * Creates a new project with " (Copy)" suffix and copies all files/folders.
   */
  async duplicate(projectId: string): Promise<ServiceResult<ProjectRow>> {
    // Get the original project
    const projectResult = await this.getById(projectId);
    if (!projectResult.success) {
      return projectResult;
    }
    const originalProject = projectResult.data;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Create new project with "(Copy)" suffix
    const newProjectResult = await this.create({
      user_id: user.id,
      name: `${originalProject.name} (Copy)`,
      word_count_goal: originalProject.word_count_goal,
      time_goal_minutes: originalProject.time_goal_minutes,
      goal_period: originalProject.goal_period,
    });

    if (!newProjectResult.success) {
      return newProjectResult;
    }
    const newProject = newProjectResult.data;

    // Get all items from original project
    const { data: originalItems, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      // Delete the new project if we can't copy items
      await this.delete(newProject.id);
      return { success: false, error: itemsError.message };
    }

    if (originalItems && originalItems.length > 0) {
      // Map old IDs to new IDs for parent references
      const idMap = new Map<string, string>();

      // First pass: create all items with new IDs (without parent references)
      for (const item of originalItems) {
        const newId = crypto.randomUUID();
        idMap.set(item.id, newId);
      }

      // Second pass: insert items with correct parent references
      const newItems = originalItems.map(item => ({
        id: idMap.get(item.id),
        project_id: newProject.id,
        parent_id: item.parent_id ? idMap.get(item.parent_id) : null,
        name: item.name,
        type: item.type,
        content: item.content || '',
        sort_order: item.sort_order,
      }));

      // @ts-ignore - Supabase type inference
      const { error: insertError } = await supabase
        .from('items')
        .insert(newItems);

      if (insertError) {
        // Delete the new project if we can't copy items
        await this.delete(newProject.id);
        return { success: false, error: insertError.message };
      }
    }

    return { success: true, data: newProject };
  },
};

