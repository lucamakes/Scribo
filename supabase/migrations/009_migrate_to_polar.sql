-- Migration: Stripe to Polar
-- Add Polar-specific columns to users table

-- Add new Polar columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS polar_customer_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT UNIQUE;

-- Create index for Polar customer lookups
CREATE INDEX IF NOT EXISTS idx_users_polar_customer_id ON users(polar_customer_id);

-- Drop old Stripe columns
ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE users DROP COLUMN IF EXISTS stripe_subscription_id;

-- Add comments for documentation
COMMENT ON COLUMN users.polar_customer_id IS 'Polar customer ID';
COMMENT ON COLUMN users.polar_subscription_id IS 'Active Polar subscription ID';
