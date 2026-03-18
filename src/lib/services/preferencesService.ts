import { supabase } from '@/lib/supabase';

export interface UserPreferences {
  fontSize?: number;
  lineHeight?: number;
  textColor?: string;
  autoExportEnabled?: boolean;
  autoExportIntervalMinutes?: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  fontSize: 15,
  lineHeight: 1.7,
  textColor: '#1a1a1a',
};

/**
 * Service for managing user preferences stored in the database.
 */
export const preferencesService = {
  /**
   * Get user preferences from the database.
   */
  async get(userId: string): Promise<UserPreferences> {
    const { data, error } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .single();

    if (error || !data?.preferences) {
      return DEFAULT_PREFERENCES;
    }

    return { ...DEFAULT_PREFERENCES, ...data.preferences };
  },

  /**
   * Update user preferences in the database.
   * Merges with existing preferences.
   */
  async update(userId: string, preferences: Partial<UserPreferences>): Promise<boolean> {
    // First get existing preferences
    const { data: existing } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .single();

    const mergedPreferences = {
      ...(existing?.preferences || {}),
      ...preferences,
    };

    const { error } = await supabase
      .from('users')
      .update({ preferences: mergedPreferences })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update preferences:', error);
      return false;
    }

    return true;
  },

  /**
   * Update a single preference value.
   */
  async set<K extends keyof UserPreferences>(
    userId: string,
    key: K,
    value: UserPreferences[K]
  ): Promise<boolean> {
    return this.update(userId, { [key]: value });
  },
};
