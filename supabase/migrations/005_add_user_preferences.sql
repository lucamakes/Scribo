-- Add preferences column to users table
-- Stores user settings as JSONB for flexibility

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Create index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_users_preferences ON public.users USING GIN (preferences);

COMMENT ON COLUMN public.users.preferences IS 'User preferences stored as JSON (e.g., {"fontSize": 15})';
