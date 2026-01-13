-- Manually update subscription status for testing
-- Replace 'YOUR_USER_ID' with your actual user ID

UPDATE users 
SET 
  subscription_status = 'pro',
  stripe_subscription_id = 'sub_test_123',
  subscription_end_date = NULL
WHERE id = 'YOUR_USER_ID';

-- To find your user ID, run:
-- SELECT id, email FROM auth.users;
