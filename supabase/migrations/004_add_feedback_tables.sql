-- Feedback board tables
-- Run this in your Supabase SQL Editor

-- Feedback type enum
CREATE TYPE feedback_type AS ENUM ('feature', 'bug', 'improvement');

-- Feedback status enum  
CREATE TYPE feedback_status AS ENUM ('open', 'planned', 'in_progress', 'completed', 'closed');

-- Main feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type feedback_type NOT NULL DEFAULT 'feature',
  status feedback_status NOT NULL DEFAULT 'open',
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votes table (one vote per user per feedback)
CREATE TABLE IF NOT EXISTS feedback_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(feedback_id, user_id)
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_votes ENABLE ROW LEVEL SECURITY;

-- Feedback policies
-- Anyone can view all feedback (including anonymous users)
CREATE POLICY "Anyone can view feedback"
  ON feedback FOR SELECT
  USING (true);

-- Users can create their own feedback
CREATE POLICY "Users can create feedback"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback (title/description only)
CREATE POLICY "Users can update own feedback"
  ON feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own feedback
CREATE POLICY "Users can delete own feedback"
  ON feedback FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Vote policies
-- Anyone can view votes
CREATE POLICY "Anyone can view votes"
  ON feedback_votes FOR SELECT
  USING (true);

-- Users can add their own votes
CREATE POLICY "Users can vote"
  ON feedback_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own votes
CREATE POLICY "Users can remove own vote"
  ON feedback_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update vote count
CREATE OR REPLACE FUNCTION update_feedback_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feedback SET vote_count = vote_count + 1, updated_at = NOW() WHERE id = NEW.feedback_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feedback SET vote_count = vote_count - 1, updated_at = NOW() WHERE id = OLD.feedback_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update vote count
DROP TRIGGER IF EXISTS on_vote_change ON feedback_votes;
CREATE TRIGGER on_vote_change
  AFTER INSERT OR DELETE ON feedback_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_vote_count();

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_votes ON feedback(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_user ON feedback_votes(user_id);
