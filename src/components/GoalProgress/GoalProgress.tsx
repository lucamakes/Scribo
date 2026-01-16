'use client';

import { useState, useEffect, useCallback } from 'react';
import { Target, Settings, X, Check } from 'lucide-react';
import { goalService, type ProjectGoals } from '@/lib/services/goalService';
import { projectService } from '@/lib/services/projectService';
import type { GoalPeriod } from '@/types/database';
import IconButton from '@/components/IconButton/IconButton';
import Button from '@/components/Button/Button';
import styles from './GoalProgress.module.css';

interface GoalProgressProps {
  projectId: string;
  currentWordCount: number;
}

export function GoalProgress({ projectId, currentWordCount }: GoalProgressProps) {
  const [goals, setGoals] = useState<ProjectGoals | null>(null);
  const [todayWords, setTodayWords] = useState(0);
  const [weekWords, setWeekWords] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Settings form state
  const [wordGoal, setWordGoal] = useState<string>('');
  const [period, setPeriod] = useState<GoalPeriod>('daily');
  const [saving, setSaving] = useState(false);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    
    try {
      // Load project goals
      const projectResult = await projectService.getById(projectId);
      if (projectResult.success) {
        const project = projectResult.data;
        // Check if goal fields exist (migration may not have run)
        if ('word_count_goal' in project) {
          setGoals({
            wordCountGoal: project.word_count_goal,
            timeGoalMinutes: project.time_goal_minutes,
            goalPeriod: project.goal_period || 'daily',
          });
          setWordGoal(project.word_count_goal?.toString() || '');
          setPeriod(project.goal_period || 'daily');
        }
      }

      // Load today's progress
      const todayResult = await goalService.getTodayProgress(projectId);
      if (todayResult.success && todayResult.data) {
        setTodayWords(todayResult.data.words_written);
      }

      // Load week's progress
      const weekResult = await goalService.getWeekProgress(projectId);
      if (weekResult.success) {
        const total = weekResult.data.reduce((sum, day) => sum + day.words_written, 0);
        setWeekWords(total);
      }
    } catch (error) {
      console.error('Failed to load goals:', error);
    }

    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Listen for goal progress updates from DetailPanel
  useEffect(() => {
    const handleGoalUpdate = (e: CustomEvent<{ wordsAdded: number }>) => {
      const { wordsAdded } = e.detail;
      // Update local state directly without refetching
      setTodayWords(prev => prev + wordsAdded);
      setWeekWords(prev => prev + wordsAdded);
    };

    window.addEventListener('goalProgressUpdated', handleGoalUpdate as EventListener);
    return () => {
      window.removeEventListener('goalProgressUpdated', handleGoalUpdate as EventListener);
    };
  }, []);

  const handleSaveGoals = async () => {
    setSaving(true);
    try {
      const result = await goalService.updateGoals(projectId, {
        wordCountGoal: wordGoal ? parseInt(wordGoal, 10) : null,
        goalPeriod: period,
      });
      
      if (result.success) {
        setGoals({
          wordCountGoal: wordGoal ? parseInt(wordGoal, 10) : null,
          timeGoalMinutes: null,
          goalPeriod: period,
        });
        setShowSettings(false);
      } else {
        console.error('Failed to save goals:', (result as { success: false; error: string }).error);
        alert('Failed to save goal. Please make sure the database migration has been run.');
      }
    } catch (error) {
      console.error('Failed to save goals:', error);
      alert('Failed to save goal. Please try again.');
    }
    setSaving(false);
  };

  const handleClearGoal = async () => {
    setSaving(true);
    await goalService.updateGoals(projectId, {
      wordCountGoal: null,
      goalPeriod: 'daily',
    });
    setGoals(null);
    setWordGoal('');
    setPeriod('daily');
    setShowSettings(false);
    setSaving(false);
  };

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
          <IconButton onClick={onClose} title="Close" variant="ghost">
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
