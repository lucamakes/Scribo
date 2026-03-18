'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { saveAs } from 'file-saver';
import type { ItemRow } from '@/types/database';
import { itemService } from '@/lib/services/itemService';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/context/AuthContext';
import { preferencesService } from '@/lib/services/preferencesService';

const DEFAULT_INTERVAL_MINUTES = 5;

/**
 * Hook that periodically exports the current project as a JSON backup download.
 * Settings are persisted in the user's preferences JSONB column in the database.
 */
export function useAutoExport(projectId: string | null, projectName: string | null) {
  const { user } = useAuth();
  const [enabled, setEnabledState] = useState(false);
  const [intervalMinutes, setIntervalState] = useState(DEFAULT_INTERVAL_MINUTES);
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastExportRef = useRef<string | null>(null);

  // Load settings from database on mount
  useEffect(() => {
    if (!user) return;
    preferencesService.get(user.id).then(prefs => {
      setEnabledState(prefs.autoExportEnabled ?? false);
      setIntervalState(prefs.autoExportIntervalMinutes ?? DEFAULT_INTERVAL_MINUTES);
      setLoaded(true);
    });
  }, [user]);

  const doExport = useCallback(async () => {
    if (!projectId || !projectName) return;

    try {
      const result = await itemService.getByProject(projectId);
      if (!result.success) return;

      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error || !project) return;

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        autoExport: true,
        project: {
          name: project.name,
          word_count_goal: project.word_count_goal,
          time_goal_minutes: project.time_goal_minutes,
          goal_period: project.goal_period,
        },
        items: result.data.map((item: ItemRow) => ({
          id: item.id,
          parent_id: item.parent_id,
          name: item.name,
          type: item.type,
          content: item.content,
          sort_order: item.sort_order,
        })),
      };

      // Skip if content hasn't changed since last export
      const hash = JSON.stringify(exportData.items);
      if (hash === lastExportRef.current) return;
      lastExportRef.current = hash;

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      saveAs(blob, `${projectName}-backup-${timestamp}.scribo.json`);
    } catch (err) {
      console.error('Auto-export failed:', err);
    }
  }, [projectId, projectName]);

  // Manage the interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (loaded && enabled && projectId) {
      intervalRef.current = setInterval(doExport, intervalMinutes * 60 * 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loaded, enabled, intervalMinutes, projectId, doExport]);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    if (user) {
      preferencesService.set(user.id, 'autoExportEnabled', value);
    }
  }, [user]);

  const setIntervalMinutes = useCallback((value: number) => {
    const clamped = Math.max(1, value);
    setIntervalState(clamped);
    if (user) {
      preferencesService.set(user.id, 'autoExportIntervalMinutes', clamped);
    }
  }, [user]);

  return {
    enabled,
    intervalMinutes,
    setEnabled,
    setIntervalMinutes,
    exportNow: doExport,
  };
}
