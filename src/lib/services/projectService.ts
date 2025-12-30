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
    const { data, error } = await supabase
      .from('projects')
      .insert(project as any)
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
};

