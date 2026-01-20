import { supabase } from '@/lib/supabase';

const FREE_WORD_LIMIT = 15000;

export type SubscriptionStatus = 'free' | 'pro' | 'cancelled';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  polarCustomerId: string | null;
  subscriptionEndDate: string | null;
}

export interface WordCountInfo {
  totalWords: number;
  limit: number;
  percentage: number;
  isAtLimit: boolean;
  isPro: boolean;
}

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface UserSubscriptionData {
  subscription_status: string | null;
  polar_customer_id: string | null;
  subscription_end_date: string | null;
}

interface ItemContentData {
  content: string | null;
}

/**
 * Service for subscription and word count management.
 */
export const subscriptionService = {
  /**
   * Get user's subscription status.
   */
  async getStatus(userId: string): Promise<ServiceResult<SubscriptionInfo>> {
    // @ts-ignore - users table may not be in generated types yet
    const { data, error } = await supabase
      .from('users')
      .select('subscription_status, polar_customer_id, subscription_end_date')
      .eq('id', userId)
      .single();

    if (error) {
      // User might not exist in users table yet
      if (error.code === 'PGRST116') {
        return {
          success: true,
          data: {
            status: 'free',
            polarCustomerId: null,
            subscriptionEndDate: null,
          },
        };
      }
      return { success: false, error: error.message };
    }

    if (!data) {
      return {
        success: true,
        data: {
          status: 'free',
          polarCustomerId: null,
          subscriptionEndDate: null,
        },
      };
    }

    const userData = data as UserSubscriptionData;

    return {
      success: true,
      data: {
        status: (userData.subscription_status as SubscriptionStatus) || 'free',
        polarCustomerId: userData.polar_customer_id,
        subscriptionEndDate: userData.subscription_end_date,
      },
    };
  },

  /**
   * Check if user has Pro access.
   * Pro users have 'pro' status, or 'cancelled' with end date in the future.
   */
  async isPro(userId: string): Promise<boolean> {
    const result = await this.getStatus(userId);
    if (!result.success) return false;

    const { status, subscriptionEndDate } = result.data;

    if (status === 'pro') return true;

    // Cancelled but still has access until end date
    if (status === 'cancelled' && subscriptionEndDate) {
      return new Date(subscriptionEndDate) > new Date();
    }

    return false;
  },

  /**
   * Count total words across all user's projects.
   */
  async getTotalWordCount(userId: string): Promise<ServiceResult<number>> {
    // Get all projects for user
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId);

    if (projectsError) {
      return { success: false, error: projectsError.message };
    }

    if (!projects || projects.length === 0) {
      return { success: true, data: 0 };
    }

    const projectIds = projects.map((p: { id: string }) => p.id);

    // Get all file content from these projects
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('content')
      .in('project_id', projectIds)
      .eq('type', 'file');

    if (itemsError) {
      return { success: false, error: itemsError.message };
    }

    // Count words in all content
    let totalWords = 0;
    for (const item of (items || []) as ItemContentData[]) {
      if (item.content) {
        totalWords += countWords(item.content);
      }
    }

    return { success: true, data: totalWords };
  },

  /**
   * Get word count info including limit and percentage.
   */
  async getWordCountInfo(userId: string): Promise<ServiceResult<WordCountInfo>> {
    const [wordCountResult, isPro] = await Promise.all([
      this.getTotalWordCount(userId),
      this.isPro(userId),
    ]);

    if (!wordCountResult.success) {
      return { success: false, error: wordCountResult.error };
    }

    const totalWords = wordCountResult.data;
    const limit = isPro ? Infinity : FREE_WORD_LIMIT;
    const percentage = isPro ? 0 : Math.min((totalWords / FREE_WORD_LIMIT) * 100, 100);
    const isAtLimit = !isPro && totalWords >= FREE_WORD_LIMIT;

    return {
      success: true,
      data: {
        totalWords,
        limit,
        percentage,
        isAtLimit,
        isPro,
      },
    };
  },

  /**
   * Check if user can add more words.
   */
  async canAddWords(userId: string, additionalWords: number = 1): Promise<boolean> {
    const result = await this.getWordCountInfo(userId);
    if (!result.success) return false;

    const { totalWords, isPro } = result.data;
    if (isPro) return true;

    return totalWords + additionalWords <= FREE_WORD_LIMIT;
  },

  /**
   * Get the word limit for display.
   */
  getWordLimit(isPro: boolean): number {
    return isPro ? Infinity : FREE_WORD_LIMIT;
  },

  /**
   * Get the free word limit constant.
   */
  getFreeWordLimit(): number {
    return FREE_WORD_LIMIT;
  },
};

/**
 * Count words in HTML content.
 * Strips HTML tags and counts actual words.
 */
function countWords(html: string): number {
  if (!html) return 0;

  // Strip HTML tags
  const text = html.replace(/<[^>]*>/g, ' ');

  // Normalize whitespace and split
  const words = text
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word.length > 0);

  return words.length;
}

export { countWords };
