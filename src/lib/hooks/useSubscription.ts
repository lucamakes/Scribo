import { useState, useEffect, useCallback } from 'react';
import { subscriptionService, type WordCountInfo, type SubscriptionStatus } from '@/lib/services/subscriptionService';
import { supabase } from '@/lib/supabase';

interface UseSubscriptionReturn {
  status: SubscriptionStatus;
  isPro: boolean;
  wordCount: number;
  wordLimit: number;
  percentage: number;
  isAtLimit: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to access subscription status and word count info.
 */
export function useSubscription(): UseSubscriptionReturn {
  const [status, setStatus] = useState<SubscriptionStatus>('free');
  const [wordCountInfo, setWordCountInfo] = useState<WordCountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setStatus('free');
        setWordCountInfo({
          totalWords: 0,
          limit: subscriptionService.getFreeWordLimit(),
          percentage: 0,
          isAtLimit: false,
          isPro: false,
        });
        setIsLoading(false);
        return;
      }

      const [statusResult, wordCountResult] = await Promise.all([
        subscriptionService.getStatus(user.id),
        subscriptionService.getWordCountInfo(user.id),
      ]);

      if (statusResult.success) {
        setStatus(statusResult.data.status);
      }

      if (wordCountResult.success) {
        setWordCountInfo(wordCountResult.data);
      }

      if (!statusResult.success || !wordCountResult.success) {
        setError(statusResult.success ? '' : statusResult.error);
      }
    } catch (err) {
      setError('Failed to load subscription info');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isPro = wordCountInfo?.isPro ?? false;

  return {
    status,
    isPro,
    wordCount: wordCountInfo?.totalWords ?? 0,
    wordLimit: wordCountInfo?.limit ?? subscriptionService.getFreeWordLimit(),
    percentage: wordCountInfo?.percentage ?? 0,
    isAtLimit: wordCountInfo?.isAtLimit ?? false,
    isLoading,
    error,
    refresh: fetchData,
  };
}
