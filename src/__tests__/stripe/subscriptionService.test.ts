import { countWords, subscriptionService } from '@/lib/services/subscriptionService';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('subscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('countWords', () => {
    it('should count words in plain text', () => {
      expect(countWords('hello world')).toBe(2);
      expect(countWords('one two three four five')).toBe(5);
    });

    it('should strip HTML tags and count words', () => {
      expect(countWords('<p>hello world</p>')).toBe(2);
      expect(countWords('<h1>Title</h1><p>Some content here</p>')).toBe(4);
    });

    it('should handle empty content', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
    });

    it('should handle &nbsp; entities', () => {
      expect(countWords('hello&nbsp;world')).toBe(2);
    });

    it('should handle complex HTML', () => {
      const html = `
        <h1>Chapter One</h1>
        <p>This is the <strong>first</strong> paragraph.</p>
        <p>And this is the <em>second</em> one.</p>
      `;
      // "Chapter One This is the first paragraph And this is the second one" = 13 words
      expect(countWords(html)).toBe(13);
    });
  });

  describe('getStatus', () => {
    it('should return free status for new users', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
          }),
        }),
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const result = await subscriptionService.getStatus('user-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('free');
        expect(result.data.stripeCustomerId).toBeNull();
      }
    });

    it('should return pro status for subscribed users', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              subscription_status: 'pro',
              stripe_customer_id: 'cus_123',
              subscription_end_date: null,
            },
            error: null,
          }),
        }),
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const result = await subscriptionService.getStatus('user-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('pro');
        expect(result.data.stripeCustomerId).toBe('cus_123');
      }
    });
  });

  describe('isPro', () => {
    it('should return true for pro users', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { subscription_status: 'pro', stripe_customer_id: 'cus_123', subscription_end_date: null },
            error: null,
          }),
        }),
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const isPro = await subscriptionService.isPro('user-123');
      expect(isPro).toBe(true);
    });

    it('should return false for free users', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { subscription_status: 'free', stripe_customer_id: null, subscription_end_date: null },
            error: null,
          }),
        }),
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const isPro = await subscriptionService.isPro('user-123');
      expect(isPro).toBe(false);
    });

    it('should return true for cancelled users with future end date', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              subscription_status: 'cancelled',
              stripe_customer_id: 'cus_123',
              subscription_end_date: futureDate.toISOString(),
            },
            error: null,
          }),
        }),
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const isPro = await subscriptionService.isPro('user-123');
      expect(isPro).toBe(true);
    });

    it('should return false for cancelled users with past end date', async () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              subscription_status: 'cancelled',
              stripe_customer_id: 'cus_123',
              subscription_end_date: pastDate.toISOString(),
            },
            error: null,
          }),
        }),
      });
      (mockSupabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      const isPro = await subscriptionService.isPro('user-123');
      expect(isPro).toBe(false);
    });
  });

  describe('getWordLimit', () => {
    it('should return 15000 for free users', () => {
      expect(subscriptionService.getWordLimit(false)).toBe(15000);
    });

    it('should return Infinity for pro users', () => {
      expect(subscriptionService.getWordLimit(true)).toBe(Infinity);
    });
  });

  describe('getFreeWordLimit', () => {
    it('should return 15000', () => {
      expect(subscriptionService.getFreeWordLimit()).toBe(15000);
    });
  });
});
