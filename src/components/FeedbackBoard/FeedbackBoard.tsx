'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { feedbackService } from '@/lib/services/feedbackService';
import type { Feedback, FeedbackType, FeedbackStatus } from '@/types/feedback';
import {
  Plus,
  ChevronUp,
  Lightbulb,
  Bug,
  Sparkles,
  X,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  LogIn,
  ArrowLeft
} from 'lucide-react';
import styles from './FeedbackBoard.module.css';

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: typeof Lightbulb; color: string }> = {
  feature: { label: 'Feature', icon: Lightbulb, color: '#6366f1' },
  bug: { label: 'Bug', icon: Bug, color: '#ef4444' },
  improvement: { label: 'Improvement', icon: Sparkles, color: '#10b981' },
};

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; icon: typeof Clock; color: string }> = {
  open: { label: 'Open', icon: Clock, color: '#6b7280' },
  planned: { label: 'Planned', icon: Check, color: '#6366f1' },
  in_progress: { label: 'In Progress', icon: Clock, color: '#f59e0b' },
  completed: { label: 'Completed', icon: CheckCircle2, color: '#10b981' },
  closed: { label: 'Closed', icon: XCircle, color: '#6b7280' },
};

interface FeedbackBoardProps {
  showBackButton?: boolean;
}

export default function FeedbackBoard({ showBackButton = false }: FeedbackBoardProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [filterType, setFilterType] = useState<FeedbackType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<FeedbackType>('feature');
  const [submitting, setSubmitting] = useState(false);
  const [itemsToShow, setItemsToShow] = useState(5);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    const result = await feedbackService.getAll(user?.id);
    if (result.success) {
      setFeedback(result.data);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) {
      loadFeedback();
    }
  }, [authLoading, loadFeedback]);

  const handleVote = async (feedbackId: string, hasVoted: boolean) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

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
      loadFeedback();
    }
  };

  const handleNewFeedback = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setShowNewForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;

    setSubmitting(true);
    const result = await feedbackService.create(
      user.id,
      newTitle.trim(),
      newDescription.trim() || null,
      newType
    );

    if (result.success) {
      setFeedback(prev => [result.data, ...prev]);
      setNewTitle('');
      setNewDescription('');
      setNewType('feature');
      setShowNewForm(false);
    }
    setSubmitting(false);
  };

  const filteredFeedback = feedback
    .filter(f => filterType === 'all' || f.type === filterType)
    .filter(f => filterStatus === 'all' || f.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'votes') return b.vote_count - a.vote_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const displayedFeedback = filteredFeedback.slice(0, itemsToShow);
  const hasMore = filteredFeedback.length > itemsToShow;

  const handleLoadMore = () => {
    setItemsToShow(prev => prev + 5);
  };

  return (
    <section id="feedback" className={styles.feedbackBoard}>
      {showBackButton && (
        <button onClick={() => router.push('/')} className={styles.backButton}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
      )}

      <div className={styles.feedbackHeader}>
        <div className={styles.feedbackHeaderLeft}>
          <div>
            <h2 className={styles.sectionTitle}>Feedback Board</h2>
            <p className={styles.sectionSubtitle}>Help shape the future of Scripta — your ideas matter</p>
          </div>
        </div>
        <div className={styles.feedbackActions}>
          {!user && (
            <button onClick={() => router.push('/auth/login')} className={styles.loginButton}>
              <LogIn size={18} strokeWidth={1.5} />
              Log in
            </button>
          )}
          <button onClick={handleNewFeedback} className={styles.newButton}>
            <Plus size={18} strokeWidth={2} />
            New Feedback
          </button>
        </div>
      </div>

      <div className={styles.feedbackFilters}>
        <div className={styles.filterGroup}>
          <label>Type:</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value as FeedbackType | 'all')}>
            <option value="all">All</option>
            <option value="feature">Features</option>
            <option value="bug">Bugs</option>
            <option value="improvement">Improvements</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Status:</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as FeedbackStatus | 'all')}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Sort:</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'votes' | 'newest')}>
            <option value="votes">Most Votes</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      <div className={styles.feedbackList}>
        {loading ? (
          <div className={styles.feedbackLoading}>Loading feedback...</div>
        ) : filteredFeedback.length === 0 ? (
          <div className={styles.emptyState}>
            <Lightbulb size={48} strokeWidth={1} />
            <h3>No feedback yet</h3>
            <p>Be the first to share your ideas!</p>
          </div>
        ) : (
          <>
            {displayedFeedback.map(item => {
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
                    <ChevronUp size={20} strokeWidth={2} />
                    <span>{item.vote_count}</span>
                  </button>
                  <div className={styles.feedbackContent}>
                    <div className={styles.feedbackBadges}>
                      <span className={styles.typeBadge} style={{ background: `${typeConfig.color}15`, color: typeConfig.color }}>
                        <TypeIcon size={14} strokeWidth={1.5} />
                        {typeConfig.label}
                      </span>
                      <span className={styles.statusBadge} style={{ background: `${statusConfig.color}15`, color: statusConfig.color }}>
                        <StatusIcon size={14} strokeWidth={1.5} />
                        {statusConfig.label}
                      </span>
                    </div>
                    <h3 className={styles.feedbackTitle}>{item.title}</h3>
                    {item.description && (
                      <p className={styles.feedbackDescription}>{item.description}</p>
                    )}
                    <div className={styles.feedbackMeta}>
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className={styles.loadMoreContainer}>
                <button onClick={handleLoadMore} className={styles.loadMoreButton}>
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className={styles.modalOverlay} onClick={() => setShowLoginPrompt(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Sign in to continue</h2>
              <button onClick={() => setShowLoginPrompt(false)} className={styles.closeButton}>
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <div className={styles.modalContent}>
              <p>You need to be logged in to vote or submit feedback.</p>
              <div className={styles.modalActions}>
                <button onClick={() => router.push('/auth/login')} className={styles.primaryButton}>
                  Log in
                </button>
                <button onClick={() => router.push('/auth/signup')} className={styles.secondaryButton}>
                  Sign up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Feedback Modal */}
      {showNewForm && (
        <div className={styles.modalOverlay} onClick={() => setShowNewForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Submit Feedback</h2>
              <button onClick={() => setShowNewForm(false)} className={styles.closeButton}>
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.feedbackForm}>
              <div className={styles.formGroup}>
                <label>Type</label>
                <div className={styles.typeSelector}>
                  {(Object.keys(TYPE_CONFIG) as FeedbackType[]).map(type => {
                    const config = TYPE_CONFIG[type];
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        type="button"
                        className={`${styles.typeOption} ${newType === type ? styles.typeOptionActive : ''}`}
                        onClick={() => setNewType(type)}
                        style={newType === type ? { borderColor: config.color, background: `${config.color}10` } : {}}
                      >
                        <Icon size={18} strokeWidth={1.5} style={{ color: config.color }} />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="title">Title</label>
                <input
                  id="title"
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Brief summary of your feedback"
                  required
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="description">Description (optional)</label>
                <textarea
                  id="description"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Add more details..."
                  rows={4}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowNewForm(false)} className={styles.secondaryButton}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting || !newTitle.trim()} className={styles.primaryButton}>
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
