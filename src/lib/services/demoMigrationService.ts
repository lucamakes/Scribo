import { supabase } from '@/lib/supabase';
import type { ItemType, GoalPeriod } from '@/types/database';

const DEMO_STORAGE_KEY = 'scribe_demo_data';
const DEMO_GOALS_KEY = 'scribe_demo_goals';
const DEMO_MIGRATION_FLAG = 'scribe_demo_migrated';
const NEW_SIGNUP_FLAG = 'scribe_new_signup';

interface DemoProject {
  id: string;
  name: string;
  created_at: string;
}

interface DemoItem {
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

interface DemoData {
  project: DemoProject;
  items: DemoItem[];
}

interface DemoGoals {
  wordCountGoal: number | null;
  goalPeriod: GoalPeriod;
}

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Service for migrating demo data to a user's account.
 */
export const demoMigrationService = {
  /**
   * Check if there's demo data in localStorage.
   */
  hasDemoData(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      if (!stored) return false;
      
      const data: DemoData = JSON.parse(stored);
      // Check if there's actual content (not just the default empty project)
      const hasContent = data.items.some(item => 
        item.type === 'file' && item.content && item.content.trim().length > 0
      );
      return hasContent;
    } catch {
      return false;
    }
  },

  /**
   * Check if demo data has already been migrated for this session.
   */
  hasAlreadyMigrated(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(DEMO_MIGRATION_FLAG) === 'true';
  },

  /**
   * Mark demo data as migrated.
   */
  markAsMigrated(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DEMO_MIGRATION_FLAG, 'true');
  },

  /**
   * Check if this is a new signup (should import demo data).
   */
  isNewSignup(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(NEW_SIGNUP_FLAG) === 'true';
  },

  /**
   * Mark as new signup (called during signup flow).
   */
  markAsNewSignup(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(NEW_SIGNUP_FLAG, 'true');
  },

  /**
   * Clear new signup flag (called after migration or on login).
   */
  clearNewSignupFlag(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(NEW_SIGNUP_FLAG);
  },

  /**
   * Get demo data from localStorage.
   */
  getDemoData(): DemoData | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(DEMO_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  /**
   * Get demo goals from localStorage.
   */
  getDemoGoals(): DemoGoals | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(DEMO_GOALS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  /**
   * Migrate demo data to the user's account.
   * Creates a new project with all the demo items.
   */
  async migrate(): Promise<ServiceResult<{ projectId: string }>> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get demo data
    const demoData = this.getDemoData();
    if (!demoData) {
      return { success: false, error: 'No demo data found' };
    }

    // Filter out deleted items and items without meaningful content
    const activeItems = demoData.items.filter(item => !item.deleted_at);
    
    if (activeItems.length === 0) {
      return { success: false, error: 'No items to migrate' };
    }

    try {
      // Get demo goals if any
      const demoGoals = this.getDemoGoals();

      // Create new project with goals
      // @ts-ignore - Supabase type inference issue
      const { data: newProject, error: projectError } = await (supabase as any)
        .from('projects')
        .insert({
          user_id: user.id,
          name: demoData.project.name,
          word_count_goal: demoGoals?.wordCountGoal || null,
          goal_period: demoGoals?.goalPeriod || 'daily',
        })
        .select()
        .single();

      if (projectError || !newProject) {
        return { success: false, error: projectError?.message || 'Failed to create project' };
      }

      // Map old demo IDs to new UUIDs
      const idMap = new Map<string, string>();
      for (const item of activeItems) {
        idMap.set(item.id, crypto.randomUUID());
      }

      // Create items with new IDs and correct parent references
      const newItems = activeItems.map(item => ({
        id: idMap.get(item.id),
        project_id: newProject.id,
        parent_id: item.parent_id ? idMap.get(item.parent_id) || null : null,
        name: item.name,
        type: item.type,
        content: item.content || '',
        sort_order: item.sort_order,
      }));

      // Insert all items
      // @ts-ignore - Supabase type inference issue
      const { error: itemsError } = await (supabase as any)
        .from('items')
        .insert(newItems);

      if (itemsError) {
        // Clean up: delete the project if items failed
        await (supabase as any).from('projects').delete().eq('id', newProject.id);
        return { success: false, error: itemsError.message };
      }

      // Clear demo data from localStorage
      this.clearDemoData();
      this.markAsMigrated();

      // @ts-ignore
      return { success: true, data: { projectId: newProject.id } };
    } catch (error) {
      return { success: false, error: 'Migration failed' };
    }
  },

  /**
   * Clear demo data from localStorage.
   */
  clearDemoData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(DEMO_STORAGE_KEY);
    localStorage.removeItem('scribe_demo_goals');
    localStorage.removeItem('scribe_demo_daily_progress');
  },
};
