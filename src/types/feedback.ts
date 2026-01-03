export type FeedbackType = 'feature' | 'bug' | 'improvement';
export type FeedbackStatus = 'open' | 'planned' | 'in_progress' | 'completed' | 'closed';

export interface Feedback {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: FeedbackType;
  status: FeedbackStatus;
  vote_count: number;
  created_at: string;
  updated_at: string;
  user_has_voted?: boolean;
}

export interface FeedbackVote {
  id: string;
  feedback_id: string;
  user_id: string;
  created_at: string;
}
