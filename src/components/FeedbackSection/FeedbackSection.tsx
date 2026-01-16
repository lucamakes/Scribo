'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { feedbackService } from '@/lib/services/feedbackService';
import type { Feedback, FeedbackType, FeedbackStatus } from '@/types/feedback';
import { 
  ChevronUp, 
  Lightbulb, 
  Bug, 
  Sparkles,
  Clock,
  Check,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';
import styles from './FeedbackSection.module.css';

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: typeof Lightbulb; color: string }> = {
  feature: { label: 'Feature', icon: Lightbulb, color: '#1565a8' },
  bug: { label: 'Bug', icon: Bug, color: '#ef4444' },
  improvement: { label: 'Improvement', icon: Sparkles, color: '#10b981' },
};

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; icon: typeof Clock; color: string }> = {
  open: { label: 'Open', icon: Clock, color: '#6b7280' },
  planned: { label: 'Planned', icon: Check, color: '#1565a8' },
  in_progress: { label: 'In Progress', icon: Clock, color: '#f59e0b' },
  completed: { label: 'Completed', icon: CheckCircle2, color: '#10b981' },
  closed: { label: 'Closed', icon: XCircle, color: '#6b7280' },
};

export default function FeedbackSection() {
  const { user } = useAuth();
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    const result = await feedbackService.getAll(user?.id);
    if (result.success) {
      // Show top 5 most voted items
      const topFeedback = result.data
        .sort((a, b) => b.vote_count - a.vote_count)
        .slice(0, 5);
      setFeedback(topFeedback);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const handleVote = async (feedbackId: string, hasVoted: boolean) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Optimistic update
    setFeedback(prev => prev.map(f => {
      if (f.id === feedbackId) {
        return {
          ...f,
          vote_count: hasVoted ? f.vote_count - 1 : f.vote_count + 1,
          user_has_voted: !hasVoted,
        };
      }
      return f;
    }));

    const result = hasVoted 
      ? await feedbackService.unvote(feedbackId, user.id)
      : await feedbackService.vote(feedbackId, user.id);

    if (!result.success) {
      // Revert on error
      loadFeedback();
    }
  };

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.content}>
          <h2 className={styles.title}>Help shape the future</h2>
          <p className={styles.subtitle}>Vote on features and share your ideas</p>
          <div className={styles.loading}>Loading...</div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.content}>
        <h2 className={styles.title}>Help shape the future</h2>
        <p className={styles.subtitle}>Vote on features and share your ideas</p>

        <div className={styles.feedbackList}>
          {feedback.length === 0 ? (
            <div className={styles.emptyState}>
              <Lightbulb size={48} strokeWidth={1.5} />
              <p>No feedback yet. Be the first!</p>
            </div>
          ) : (
            feedback.map(item => {
              const typeConfig = TYPE_CONFIG[item.type];
              const statusConfig = STATUS_CONFIG[item.status];
              const TypeIcon = typeConfig.icon;
              const StatusIcon = statusConfig.icon;

              return (
                <div key={item.id} className={styles.feedbackItem}>
                  <button
                    className={`${styles.voteButton} ${item.user_has_voted ? styles.voted : ''}`}
                    onClick={() => handleVote(item.id, item.user_has_voted || false)}
                    title={user ? (item.user_has_voted ? 'Remove vote' : 'Upvote') : 'Log in to vote'}
                  >
                    <ChevronUp size={18} strokeWidth={2} />
                    <span>{item.vote_count}</span>
                  </button>
                  <div className={styles.feedbackContent}>
                    <div className={styles.feedbackHeader}>
                      <span className={styles.typeBadge} style={{ background: `${typeConfig.color}15`, color: typeConfig.color }}>
                        <TypeIcon size={12} strokeWidth={1.5} />
                        {typeConfig.label}
                      </span>
                      <span className={styles.statusBadge} style={{ background: `${statusConfig.color}15`, color: statusConfig.color }}>
                        <StatusIcon size={12} strokeWidth={1.5} />
                        {statusConfig.label}
                      </span>
                    </div>
                    <h3 className={styles.feedbackTitle}>{item.title}</h3>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button onClick={() => router.push('/feedback')} className={styles.viewAllButton}>
          View all feedback
          <ArrowRight size={16} strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
}
