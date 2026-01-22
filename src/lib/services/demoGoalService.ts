'use client';

import type { GoalService, ProjectGoals } from './goalService';
import type { GoalPeriod } from '@/types/database';

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const DEMO_GOALS_KEY = 'scribe_demo_goals';
const DEMO_DAILY_PROGRESS_KEY = 'scribe_demo_daily_progress';

interface StoredGoals {
  wordCountGoal: number | null;
  goalPeriod: GoalPeriod;
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function loadGoals(): StoredGoals | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(DEMO_GOALS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveGoals(goals: StoredGoals | null): void {
  if (typeof window === 'undefined') return;
  if (goals) {
    localStorage.setItem(DEMO_GOALS_KEY, JSON.stringify(goals));
  } else {
    localStorage.removeItem(DEMO_GOALS_KEY);
  }
}

function loadDailyProgress(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(DEMO_DAILY_PROGRESS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveDailyProgress(progress: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_DAILY_PROGRESS_KEY, JSON.stringify(progress));
}

export const demoGoalService: GoalService = {
  isDemo: true,

  async getGoals(): Promise<ServiceResult<ProjectGoals | null>> {
    const goals = loadGoals();
    if (!goals) {
      return { success: true, data: null };
    }
    return {
      success: true,
      data: {
        wordCountGoal: goals.wordCountGoal,
        timeGoalMinutes: null,
        goalPeriod: goals.goalPeriod,
      },
    };
  },

  async updateGoals(_projectId: string, goals: Partial<ProjectGoals>): Promise<ServiceResult<null>> {
    const current = loadGoals();
    
    if (goals.wordCountGoal === null && !goals.goalPeriod) {
      // Clearing the goal
      saveGoals(null);
    } else {
      saveGoals({
        wordCountGoal: goals.wordCountGoal ?? current?.wordCountGoal ?? null,
        goalPeriod: goals.goalPeriod ?? current?.goalPeriod ?? 'daily',
      });
    }
    
    return { success: true, data: null };
  },

  async getTodayProgress(): Promise<ServiceResult<number>> {
    const progress = loadDailyProgress();
    const today = getTodayKey();
    return { success: true, data: progress[today] || 0 };
  },

  async getWeekProgress(): Promise<ServiceResult<number>> {
    const progress = loadDailyProgress();
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    let total = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      total += progress[key] || 0;
    }

    return { success: true, data: total };
  },

  async addWords(_projectId: string, words: number): Promise<ServiceResult<void>> {
    const progress = loadDailyProgress();
    const today = getTodayKey();
    progress[today] = (progress[today] || 0) + words;
    saveDailyProgress(progress);
    return { success: true, data: undefined };
  },
};
