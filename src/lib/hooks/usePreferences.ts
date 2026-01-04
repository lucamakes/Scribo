'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { preferencesService, type UserPreferences } from '@/lib/services/preferencesService';

const DEFAULT_PREFERENCES: UserPreferences = {
  fontSize: 18,
  lineHeight: 2.0,
  textColor: '#4a4a4a',
};

/**
 * Hook for managing user preferences.
 * Loads from database on mount and provides methods to update.
 */
export function usePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from database
  useEffect(() => {
    async function loadPreferences() {
      if (!user) {
        // Fall back to localStorage for non-authenticated users
        const savedFontSize = localStorage.getItem('editorFontSize');
        if (savedFontSize) {
          setPreferences(prev => ({ ...prev, fontSize: Number(savedFontSize) }));
        }
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const prefs = await preferencesService.get(user.id);
        setPreferences(prefs);
        // Also sync to localStorage for faster initial load
        if (prefs.fontSize) {
          localStorage.setItem('editorFontSize', String(prefs.fontSize));
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, [user]);

  // Update a preference
  const updatePreference = useCallback(
    async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      // Optimistically update local state
      setPreferences(prev => ({ ...prev, [key]: value }));

      // Sync to localStorage for faster access
      if (key === 'fontSize') {
        localStorage.setItem('editorFontSize', String(value));
      }

      // Dispatch event for real-time updates across components
      window.dispatchEvent(new CustomEvent('preferenceChange', { 
        detail: { key, value } 
      }));

      // Save to database if user is authenticated
      if (user) {
        const success = await preferencesService.set(user.id, key, value);
        if (!success) {
          console.error('Failed to save preference to database');
        }
      }
    },
    [user]
  );

  // Convenience method for font size
  const setFontSize = useCallback(
    (size: number) => updatePreference('fontSize', size),
    [updatePreference]
  );

  // Convenience method for line height
  const setLineHeight = useCallback(
    (height: number) => updatePreference('lineHeight', height),
    [updatePreference]
  );

  // Convenience method for text color
  const setTextColor = useCallback(
    (color: string) => updatePreference('textColor', color),
    [updatePreference]
  );

  return {
    preferences,
    isLoading,
    updatePreference,
    setFontSize,
    setLineHeight,
    setTextColor,
    fontSize: preferences.fontSize ?? 18,
    lineHeight: preferences.lineHeight ?? 2.0,
    textColor: preferences.textColor ?? '#4a4a4a',
  };
}
