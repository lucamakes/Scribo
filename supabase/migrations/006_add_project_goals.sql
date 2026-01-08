-- ============================================
-- Migration: Add Project Goals
-- Adds word count and time goals to projects
-- ============================================

-- Add goal columns to projects table
ALTER TABLE projects
ADD COLUMN word_count_goal INTEGER DEFAULT NULL,
ADD COLUMN time_goal_minutes INTEGER DEFAULT NULL,
ADD COLUMN goal_period TEXT DEFAULT 'daily' CHECK (goal_period IN ('daily', 'weekly', 'total'));

-- Create table to track daily progress
CREATE TABLE project_goal_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    words_written INTEGER NOT NULL DEFAULT 0,
    time_spent_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One entry per project per day
    CONSTRAINT unique_project_date UNIQUE (project_id, date)
);

-- Index for fetching progress by project and date range
CREATE INDEX idx_goal_progress_project_date ON project_goal_progress(project_id, date);

-- Trigger for updated_at
CREATE TRIGGER trigger_goal_progress_updated_at
    BEFORE UPDATE ON project_goal_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE project_goal_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies (based on project ownership)
CREATE POLICY "Users can view goal progress for their projects"
    ON project_goal_progress FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_goal_progress.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert goal progress for their projects"
    ON project_goal_progress FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_goal_progress.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update goal progress for their projects"
    ON project_goal_progress FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_goal_progress.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete goal progress for their projects"
    ON project_goal_progress FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = project_goal_progress.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Function to upsert daily progress
CREATE OR REPLACE FUNCTION upsert_goal_progress(
    p_project_id UUID,
    p_words INTEGER DEFAULT 0,
    p_minutes INTEGER DEFAULT 0
)
RETURNS project_goal_progress AS $$
DECLARE
    result project_goal_progress;
BEGIN
    INSERT INTO project_goal_progress (project_id, date, words_written, time_spent_minutes)
    VALUES (p_project_id, CURRENT_DATE, p_words, p_minutes)
    ON CONFLICT (project_id, date)
    DO UPDATE SET
        words_written = project_goal_progress.words_written + EXCLUDED.words_written,
        time_spent_minutes = project_goal_progress.time_spent_minutes + EXCLUDED.time_spent_minutes,
        updated_at = NOW()
    RETURNING * INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
