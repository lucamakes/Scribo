'use client';

import { createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import type { GoalProgressRow, GoalPeriod } from '@/types/database';

// ============================================
// Types
// ============================================

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface ProjectGoals {
  wordCountGoal: number | null;
  timeGoalMinutes: number | null;
  goalPeriod: GoalPeriod;
}

// ============================================
// Goal Service Interface
// ============================================

export interface GoalService {
  isDemo: boolean;
  
  getGoals(projectId: string): Promise<ServiceResult<ProjectGoals | null>>;
  updateGoals(projectId: string, goals: Partial<ProjectGoals>): Promise<ServiceResult<null>>;
  getTodayProgress(projectId: string): Promise<ServiceResult<number>>;
  getWeekProgress(projectId: string): Promise<ServiceResult<number>>;
  addWords(projectId: string, words: number): Promise<ServiceResult<void>>;
}

// ============================================
// Context
// ============================================

export const GoalServiceContext = createContext<GoalService | null>(null);

export function useGoalService(): GoalService {
  const context = useContext(GoalServiceContext);
  if (!context) {
    throw new Error('useGoalService must be used within a GoalServiceProvider');
  }
  return context;
}

export function useGoalServiceOptional(): GoalService | null {
  return useContext(GoalServiceContext);
}

// ============================================
// Supabase Implementation
// ============================================

export const supabaseGoalService: GoalService = {
  isDemo: false,

  async getGoals(projectId: string): Promise<ServiceResult<ProjectGoals | null>> {
    const { data, error } = await (supabase as any)
      .from('projects')
      .select('word_count_goal, time_goal_minutes, goal_period')
      .eq('id', projectId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || !('word_count_goal' in data)) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        wordCountGoal: data.word_count_goal,
        timeGoalMinutes: data.time_goal_minutes,
        goalPeriod: data.goal_period || 'daily',
      },
    };
  },

  async updateGoals(projectId: string, goals: Partial<ProjectGoals>): Promise<ServiceResult<null>> {
    const updateData: Record<string, unknown> = {};
    if (goals.wordCountGoal !== undefined) updateData.word_count_goal = goals.wordCountGoal;
    if (goals.timeGoalMinutes !== undefined) updateData.time_goal_minutes = goals.timeGoalMinutes;
    if (goals.goalPeriod !== undefined) updateData.goal_period = goals.goalPeriod;

    const { error } = await (supabase as any)
      .from('projects')
      .update(updateData)
      .eq('id', projectId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: null };
  },

  async getTodayProgress(projectId: string): Promise<ServiceResult<number>> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await (supabase as any)
      .from('project_goal_progress')
      .select('words_written')
      .eq('project_id', projectId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message };
    }
    return { success: true, data: data?.words_written || 0 };
  },

  async getWeekProgress(projectId: string): Promise<ServiceResult<number>> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const { data, error } = await (supabase as any)
      .from('project_goal_progress')
      .select('words_written')
      .eq('project_id', projectId)
      .gte('date', startOfWeek.toISOString().split('T')[0])
      .lte('date', today.toISOString().split('T')[0]);

    if (error) {
      return { success: false, error: error.message };
    }

    const total = (data || []).reduce((sum: number, row: GoalProgressRow) => sum + row.words_written, 0);
    return { success: true, data: total };
  },

  async addWords(projectId: string, words: number): Promise<ServiceResult<void>> {
    const today = new Date().toISOString().split('T')[0];

    // Get current progress
    const { data: current } = await (supabase as any)
      .from('project_goal_progress')
      .select('words_written, time_spent_minutes')
      .eq('project_id', projectId)
      .eq('date', today)
      .single();

    const currentWords = current?.words_written || 0;
    const currentMinutes = current?.time_spent_minutes || 0;

    const { error } = await (supabase as any)
      .from('project_goal_progress')
      .upsert(
        {
          project_id: projectId,
          date: today,
          words_written: currentWords + words,
          time_spent_minutes: currentMinutes,
        },
        { onConflict: 'project_id,date' }
      );

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: undefined };
  },
};

// Legacy export for backward compatibility with DetailPanel
export const goalService = {
  updateGoals: supabaseGoalService.updateGoals,
  addWords: supabaseGoalService.addWords,
  getTodayProgress: async (projectId: string) => {
    const result = await supabaseGoalService.getTodayProgress(projectId);
    if (result.success) {
      return { success: true, data: { words_written: result.data } as GoalProgressRow };
    }
    return result;
  },
  getWeekProgress: async (projectId: string) => {
    const result = await supabaseGoalService.getWeekProgress(projectId);
    if (result.success) {
      return { success: true, data: [{ words_written: result.data }] as GoalProgressRow[] };
    }
    return result;
  },
};
