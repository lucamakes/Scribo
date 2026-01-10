'use client';

import { useState, useEffect, useCallback } from 'react';
import { Target, Settings, X, Check } from 'lucide-react';
import IconButton from '@/components/IconButton/IconButton';
import Button from '@/components/Button/Button';
import styles from '@/components/GoalProgress/GoalProgress.module.css';

type GoalPeriod = 'daily' | 'weekly' | 'total';

interface DemoGoals {
  wordCountGoal: number | null;
  goalPeriod: GoalPeriod;
}

interface DemoGoalProgressProps {
  currentWordCount: number;
}

const DEMO_GOALS_KEY = 'scribe_demo_goals';
const DEMO_DAILY_PROGRESS_KEY = 'scribe_demo_daily_progress';

function loadDemoGoals(): DemoGoals | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(DEMO_GOALS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveDemoGoals(goals: DemoGoals | null): void {
  if (typeof window === 'undefined') return;
  if (goals) {
    localStorage.setItem(DEMO_GOALS_KEY, JSON.stringify(goals));
  } else {
    localStorage.removeItem(DEMO_GOALS_KEY);
  }
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
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

export function DemoGoalProgress({ currentWordCount }: DemoGoalProgressProps) {
  const [goals, setGoals] = useState<DemoGoals | null>(null);
  const [todayWords, setTodayWords] = useState(0);
  const [weekWords, setWeekWords] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Settings form state
  const [wordGoal, setWordGoal] = useState<string>('');
  const [period, setPeriod] = useState<GoalPeriod>('daily');
  const [saving, setSaving] = useState(false);
  const [lastWordCount, setLastWordCount] = useState(0);

  // Load goals from localStorage
  useEffect(() => {
    const storedGoals = loadDemoGoals();
    if (storedGoals) {
      setGoals(storedGoals);
      setWordGoal(storedGoals.wordCountGoal?.toString() || '');
      setPeriod(storedGoals.goalPeriod);
    }

    // Load daily progress
    const progress = loadDailyProgress();
    const today = getTodayKey();
    setTodayWords(progress[today] || 0);

    // Calculate week progress
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    let weekTotal = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const key = date.toISOString().split('T')[0];
      weekTotal += progress[key] || 0;
    }
    setWeekWords(weekTotal);

    setLastWordCount(currentWordCount);
    setLoading(false);
  }, []);

  // Track word count changes
  useEffect(() => {
    if (loading) return;
    
    const wordsAdded = Math.max(0, currentWordCount - lastWordCount);
    if (wordsAdded > 0) {
      const progress = loadDailyProgress();
      const today = getTodayKey();
      progress[today] = (progress[today] || 0) + wordsAdded;
      saveDailyProgress(progress);
      
      setTodayWords(prev => prev + wordsAdded);
      setWeekWords(prev => prev + wordsAdded);
    }
    setLastWordCount(currentWordCount);
  }, [currentWordCount, lastWordCount, loading]);

  const handleSaveGoals = useCallback(() => {
    setSaving(true);
    const newGoals: DemoGoals = {
      wordCountGoal: wordGoal ? parseInt(wordGoal, 10) : null,
      goalPeriod: period,
    };
    saveDemoGoals(newGoals);
    setGoals(newGoals);
    setShowSettings(false);
    setSaving(false);
  }, [wordGoal, period]);

  const handleClearGoal = useCallback(() => {
    setSaving(true);
    saveDemoGoals(null);
    setGoals(null);
    setWordGoal('');
    setPeriod('daily');
    setShowSettings(false);
    setSaving(false);
  }, []);

  if (loading) {
    return null;
  }

  // No goal set - show minimal button
  if (!goals?.wordCountGoal) {
    return (
      <>
        <Button
          onClick={() => setShowSettings(true)}
          variant="secondary"
          title="Set word count goal"
          className={styles.setGoalButton}
        >
          <Target size={14} strokeWidth={1.5} />
          <span>Set Goal</span>
        </Button>

        {showSettings && (
          <GoalSettingsModal
            wordGoal={wordGoal}
            setWordGoal={setWordGoal}
            period={period}
            setPeriod={setPeriod}
            saving={saving}
            onSave={handleSaveGoals}
            onClear={handleClearGoal}
            onClose={() => setShowSettings(false)}
            hasExistingGoal={false}
          />
        )}
      </>
    );
  }

  // Calculate progress
  const goal = goals.wordCountGoal;
  const current = goals.goalPeriod === 'daily' ? todayWords : 
                  goals.goalPeriod === 'weekly' ? weekWords : 
                  currentWordCount;
  const percentage = Math.min((current / goal) * 100, 100);
  const isComplete = current >= goal;

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.label}>
            <Target size={12} strokeWidth={1.5} />
            <span>{goals.goalPeriod === 'daily' ? 'Today' : goals.goalPeriod === 'weekly' ? 'This Week' : 'Total'}</span>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className={styles.settingsButton}
            title="Goal settings"
          >
            <Settings size={12} strokeWidth={1.5} />
          </button>
        </div>
        
        <div className={styles.progressBar}>
          <div 
            className={`${styles.progressFill} ${isComplete ? styles.complete : ''}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className={styles.stats}>
          <span className={styles.current}>{current.toLocaleString()}</span>
          <span className={styles.separator}>/</span>
          <span className={styles.goal}>{goal.toLocaleString()}</span>
          {isComplete && <Check size={12} className={styles.checkIcon} />}
        </div>
      </div>

      {showSettings && (
        <GoalSettingsModal
          wordGoal={wordGoal}
          setWordGoal={setWordGoal}
          period={period}
          setPeriod={setPeriod}
          saving={saving}
          onSave={handleSaveGoals}
          onClear={handleClearGoal}
          onClose={() => setShowSettings(false)}
          hasExistingGoal={true}
        />
      )}
    </>
  );
}

interface GoalSettingsModalProps {
  wordGoal: string;
  setWordGoal: (v: string) => void;
  period: GoalPeriod;
  setPeriod: (v: GoalPeriod) => void;
  saving: boolean;
  onSave: () => void;
  onClear: () => void;
  onClose: () => void;
  hasExistingGoal: boolean;
}

function GoalSettingsModal({
  wordGoal,
  setWordGoal,
  period,
  setPeriod,
  saving,
  onSave,
  onClear,
  onClose,
  hasExistingGoal,
}: GoalSettingsModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <Target size={18} strokeWidth={1.5} />
            Word Count Goal
          </h3>
          <IconButton onClick={onClose} title="Close">
            <X size={18} strokeWidth={1.5} />
          </IconButton>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Target Words</label>
            <input
              type="number"
              value={wordGoal}
              onChange={e => setWordGoal(e.target.value)}
              placeholder="e.g., 1000"
              className={styles.input}
              min="1"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Goal Period</label>
            <div className={styles.periodOptions}>
              <button
                onClick={() => setPeriod('daily')}
                className={`${styles.periodButton} ${period === 'daily' ? styles.active : ''}`}
              >
                Daily
              </button>
              <button
                onClick={() => setPeriod('weekly')}
                className={`${styles.periodButton} ${period === 'weekly' ? styles.active : ''}`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPeriod('total')}
                className={`${styles.periodButton} ${period === 'total' ? styles.active : ''}`}
              >
                Total
              </button>
            </div>
            <p className={styles.periodHint}>
              {period === 'daily' && 'Track words written each day'}
              {period === 'weekly' && 'Track words written this week'}
              {period === 'total' && 'Track total project word count'}
            </p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          {hasExistingGoal && (
            <Button onClick={onClear} variant="secondary" disabled={saving} className={styles.clearButton}>
              Remove Goal
            </Button>
          )}
          <div className={styles.footerRight}>
            <Button onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving || !wordGoal}>
              {saving ? 'Saving...' : 'Save Goal'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
