import { supabase } from '@/lib/supabase';
import type { GoalProgressRow, GoalPeriod } from '@/types/database';

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface ProjectGoals {
  wordCountGoal: number | null;
  timeGoalMinutes: number | null;
  goalPeriod: GoalPeriod;
}

export const goalService = {
  /**
   * Update project goals
   */
  async updateGoals(
    projectId: string,
    goals: Partial<ProjectGoals>
  ): Promise<ServiceResult<null>> {
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

  /**
   * Get today's progress for a project
   */
  async getTodayProgress(projectId: string): Promise<ServiceResult<GoalProgressRow | null>> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await (supabase as any)
      .from('project_goal_progress')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message };
    }
    return { success: true, data: data || null };
  },

  /**
   * Get progress for a date range
   */
  async getProgressRange(
    projectId: string,
    startDate: string,
    endDate: string
  ): Promise<ServiceResult<GoalProgressRow[]>> {
    const { data, error } = await (supabase as any)
      .from('project_goal_progress')
      .select('*')
      .eq('project_id', projectId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data || [] };
  },

  /**
   * Get this week's progress
   */
  async getWeekProgress(projectId: string): Promise<ServiceResult<GoalProgressRow[]>> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    return this.getProgressRange(
      projectId,
      startOfWeek.toISOString().split('T')[0],
      today.toISOString().split('T')[0]
    );
  },

  /**
   * Add words to today's progress
   */
  async addWords(projectId: string, words: number): Promise<ServiceResult<GoalProgressRow>> {
    const today = new Date().toISOString().split('T')[0];
    
    // First, get current progress for today
    const current = await this.getTodayProgress(projectId);
    const currentWords = current.success && current.data ? current.data.words_written : 0;
    
    const { data, error } = await (supabase as any)
      .from('project_goal_progress')
      .upsert(
        {
          project_id: projectId,
          date: today,
          words_written: currentWords + words,
          time_spent_minutes: current.success && current.data ? current.data.time_spent_minutes : 0,
        },
        { onConflict: 'project_id,date' }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Update today's word count (set absolute value)
   */
  async setTodayWords(projectId: string, words: number): Promise<ServiceResult<GoalProgressRow>> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await (supabase as any)
      .from('project_goal_progress')
      .upsert(
        {
          project_id: projectId,
          date: today,
          words_written: words,
        },
        { onConflict: 'project_id,date' }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  /**
   * Add time to today's progress
   */
  async addTime(projectId: string, minutes: number): Promise<ServiceResult<GoalProgressRow>> {
    const today = new Date().toISOString().split('T')[0];
    
    const current = await this.getTodayProgress(projectId);
    const currentMinutes = current.success && current.data ? current.data.time_spent_minutes : 0;
    
    const { data, error } = await (supabase as any)
      .from('project_goal_progress')
      .upsert(
        {
          project_id: projectId,
          date: today,
          words_written: current.success && current.data ? current.data.words_written : 0,
          time_spent_minutes: currentMinutes + minutes,
        },
        { onConflict: 'project_id,date' }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },
};
