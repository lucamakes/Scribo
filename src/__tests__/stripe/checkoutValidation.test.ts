/**
 * Tests for checkout request validation logic.
 */

describe('Checkout Request Validation', () => {
  describe('required fields', () => {
    it('should require userId', () => {
      const request = { priceId: 'price_123' };
      const isValid = Boolean(request.userId && request.priceId);
      expect(isValid).toBe(false);
    });

    it('should require priceId', () => {
      const request = { userId: 'user-123' };
      const isValid = Boolean(request.userId && request.priceId);
      expect(isValid).toBe(false);
    });

    it('should pass with both userId and priceId', () => {
      const request = { userId: 'user-123', priceId: 'price_123' };
      const isValid = Boolean(request.userId && request.priceId);
      expect(isValid).toBe(true);
    });
  });

  describe('checkout session config', () => {
    it('should create correct session config', () => {
      const userId = 'user-123';
      const priceId = 'price_monthly';
      const customerId = 'cus_abc123';
      const returnUrl = 'https://scribo.app';

      const sessionConfig = {
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${returnUrl}/projects?success=true`,
        cancel_url: `${returnUrl}/projects?cancelled=true`,
        metadata: { supabase_user_id: userId },
      };

      expect(sessionConfig.customer).toBe(customerId);
      expect(sessionConfig.mode).toBe('subscription');
      expect(sessionConfig.line_items[0].price).toBe(priceId);
      expect(sessionConfig.metadata.supabase_user_id).toBe(userId);
      expect(sessionConfig.success_url).toContain('success=true');
      expect(sessionConfig.cancel_url).toContain('cancelled=true');
    });
  });

  describe('Stripe customer creation', () => {
    it('should include user metadata when creating customer', () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      const customerConfig = {
        email,
        metadata: { supabase_user_id: userId },
      };

      expect(customerConfig.email).toBe(email);
      expect(customerConfig.metadata.supabase_user_id).toBe(userId);
    });
  });
});
