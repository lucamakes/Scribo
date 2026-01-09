import { supabase } from '@/lib/supabase';
import type { VersionRow, VersionInsert } from '@/types/version';

/**
 * Result type for service operations
 */
type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Count words in HTML content
 */
function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

/**
 * Service for version history operations.
 * Versions are created manually by the user.
 */
export const versionService = {
  /**
   * Create a new version for an item (manual save).
   * Deduplicates identical content.
   */
  async createVersion(itemId: string, content: string): Promise<ServiceResult<VersionRow | null>> {
    const wordCount = countWords(content);
    
    try {
      // @ts-ignore - Supabase RPC type inference
      const { data: versionId, error: rpcError } = await supabase.rpc('create_item_version', {
        p_item_id: itemId,
        p_content: content,
        p_word_count: wordCount
      });

      if (rpcError) {
        throw rpcError;
      }

      // If null returned, content was duplicate
      if (!versionId) {
        return { success: true, data: null };
      }

      // Fetch the created version
      const { data, error } = await supabase
        .from('item_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch {
      // Fallback: manual implementation if RPC doesn't exist
      return this.createVersionFallback(itemId, content, wordCount);
    }
  },

  /**
   * Fallback version creation without database function
   */
  async createVersionFallback(itemId: string, content: string, wordCount: number): Promise<ServiceResult<VersionRow | null>> {
    // Check last version content
    const { data: lastVersion } = await supabase
      .from('item_versions')
      .select('content')
      .eq('item_id', itemId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single() as { data: { content: string } | null };

    // Skip if content is identical
    if (lastVersion && lastVersion.content === content) {
      return { success: true, data: null };
    }

    // Get next version number
    const { data: maxVersion } = await supabase
      .from('item_versions')
      .select('version_number')
      .eq('item_id', itemId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single() as { data: { version_number: number } | null };

    const nextVersion = (maxVersion ? maxVersion.version_number : 0) + 1;

    const insert: VersionInsert = {
      item_id: itemId,
      version_number: nextVersion,
      content,
      word_count: wordCount
    };

    const { data, error } = await supabase
      .from('item_versions')
      // @ts-ignore - Supabase type inference
      .insert(insert)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Get all versions for an item, ordered by most recent first.
   */
  async getVersions(itemId: string, limit: number = 50): Promise<ServiceResult<VersionRow[]>> {
    const { data, error } = await supabase
      .from('item_versions')
      .select('*')
      .eq('item_id', itemId)
      .order('version_number', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data ?? [] };
  },

  /**
   * Get a specific version by ID.
   */
  async getVersion(versionId: string): Promise<ServiceResult<VersionRow>> {
    const { data, error } = await supabase
      .from('item_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Get the latest version for an item.
   */
  async getLatestVersion(itemId: string): Promise<ServiceResult<VersionRow | null>> {
    const { data, error } = await supabase
      .from('item_versions')
      .select('*')
      .eq('item_id', itemId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      return { success: false, error: error.message };
    }
    return { success: true, data: data ?? null };
  },

  /**
   * Delete all versions for an item.
   */
  async deleteVersions(itemId: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('item_versions')
      .delete()
      .eq('item_id', itemId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: null };
  },

  /**
   * Get version count for an item.
   */
  async getVersionCount(itemId: string): Promise<ServiceResult<number>> {
    const { count, error } = await supabase
      .from('item_versions')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', itemId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: count ?? 0 };
  }
};
