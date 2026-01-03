import { supabase } from '@/lib/supabase';
import type { Feedback, FeedbackType } from '@/types/feedback';

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export const feedbackService = {
  /**
   * Get all feedback with user's vote status (if logged in)
   */
  async getAll(userId?: string | null): Promise<ServiceResult<Feedback[]>> {
    // Get all feedback
    // @ts-ignore - feedback table not in generated types yet
    const { data: feedback, error } = await supabase
      .from('feedback')
      .select('*')
      .order('vote_count', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // Get user's votes if logged in
    let votedIds = new Set<string>();
    if (userId) {
      // @ts-ignore - feedback_votes table not in generated types yet
      const { data: votes } = await supabase
        .from('feedback_votes')
        .select('feedback_id')
        .eq('user_id', userId);

      votedIds = new Set((votes as { feedback_id: string }[] | null)?.map(v => v.feedback_id) || []);
    }

    // Add user_has_voted flag
    const feedbackWithVotes = (feedback as Feedback[]).map(f => ({
      ...f,
      user_has_voted: votedIds.has(f.id),
    }));

    return { success: true, data: feedbackWithVotes };
  },

  /**
   * Create new feedback
   */
  async create(
    userId: string,
    title: string,
    description: string | null,
    type: FeedbackType
  ): Promise<ServiceResult<Feedback>> {
    // @ts-ignore - feedback table not in generated types yet
    const { data, error } = await supabase
      .from('feedback')
      // @ts-ignore
      .insert({
        user_id: userId,
        title,
        description,
        type,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: { ...(data as Feedback), user_has_voted: false } };
  },

  /**
   * Vote for feedback
   */
  async vote(feedbackId: string, userId: string): Promise<ServiceResult<null>> {
    // @ts-ignore - feedback_votes table not in generated types yet
    const { error } = await supabase
      .from('feedback_votes')
      // @ts-ignore
      .insert({
        feedback_id: feedbackId,
        user_id: userId,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  },

  /**
   * Remove vote from feedback
   */
  async unvote(feedbackId: string, userId: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('feedback_votes')
      .delete()
      .eq('feedback_id', feedbackId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  },

  /**
   * Delete feedback (only owner can delete)
   */
  async delete(feedbackId: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('feedback')
      .delete()
      .eq('id', feedbackId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  },
};
