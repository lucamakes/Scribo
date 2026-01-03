import { posthog } from './posthog';

/**
 * Track custom events for analytics
 */
export const analytics = {
  // User events
  signup: (method: 'email' | 'google' = 'email') => {
    posthog?.capture('user_signed_up', { method });
  },

  login: () => {
    posthog?.capture('user_logged_in');
  },

  // Project events
  projectCreated: (template?: string) => {
    posthog?.capture('project_created', { template });
  },

  projectDeleted: () => {
    posthog?.capture('project_deleted');
  },

  // Writing events
  fileCreated: () => {
    posthog?.capture('file_created');
  },

  exportCompleted: (format: string) => {
    posthog?.capture('export_completed', { format });
  },

  // Subscription events
  upgradeClicked: (plan: 'monthly' | 'yearly') => {
    posthog?.capture('upgrade_clicked', { plan });
  },

  upgradeCompleted: (plan: 'monthly' | 'yearly') => {
    posthog?.capture('upgrade_completed', { plan });
  },

  limitReached: () => {
    posthog?.capture('word_limit_reached');
  },

  // Feature usage
  constellationViewed: () => {
    posthog?.capture('constellation_viewed');
  },

  searchUsed: () => {
    posthog?.capture('search_used');
  },

  // Identify user (call after login)
  identify: (userId: string, email?: string) => {
    posthog?.identify(userId, { email });
  },

  // Reset on logout
  reset: () => {
    posthog?.reset();
  },
};
