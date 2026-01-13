-- Check current subscription status
SELECT 
  u.id,
  u.email,
  u.subscription_status,
  u.stripe_customer_id,
  u.stripe_subscription_id,
  u.subscription_end_date,
  u.created_at
FROM users u
ORDER BY u.created_at DESC
LIMIT 10;
