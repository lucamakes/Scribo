-- ============================================
-- Version History for Items
-- Tracks content snapshots for files and canvas
-- ============================================

-- Create version history table
CREATE TABLE item_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique version numbers per item
    CONSTRAINT unique_version_per_item UNIQUE (item_id, version_number)
);

-- Index for efficient queries
CREATE INDEX idx_item_versions_item_id ON item_versions(item_id);
CREATE INDEX idx_item_versions_created_at ON item_versions(item_id, created_at DESC);

-- Function to get next version number for an item
CREATE OR REPLACE FUNCTION get_next_version_number(p_item_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM item_versions
    WHERE item_id = p_item_id;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new version (with deduplication)
CREATE OR REPLACE FUNCTION create_item_version(
    p_item_id UUID,
    p_content TEXT,
    p_word_count INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    last_content TEXT;
    new_version_id UUID;
    next_version INTEGER;
BEGIN
    -- Check if content is different from last version
    SELECT content INTO last_content
    FROM item_versions
    WHERE item_id = p_item_id
    ORDER BY version_number DESC
    LIMIT 1;
    
    -- Skip if content is identical
    IF last_content IS NOT NULL AND last_content = p_content THEN
        RETURN NULL;
    END IF;
    
    -- Get next version number
    next_version := get_next_version_number(p_item_id);
    
    -- Insert new version
    INSERT INTO item_versions (item_id, version_number, content, word_count)
    VALUES (p_item_id, next_version, p_content, p_word_count)
    RETURNING id INTO new_version_id;
    
    RETURN new_version_id;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old versions (keep last N versions per item)
CREATE OR REPLACE FUNCTION cleanup_old_versions(p_keep_count INTEGER DEFAULT 50)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH versions_to_delete AS (
        SELECT id
        FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY version_number DESC) as rn
            FROM item_versions
        ) ranked
        WHERE rn > p_keep_count
    )
    DELETE FROM item_versions
    WHERE id IN (SELECT id FROM versions_to_delete);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE item_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access versions of items they own
CREATE POLICY "Users can view versions of their items"
    ON item_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM items i
            JOIN projects p ON i.project_id = p.id
            WHERE i.id = item_versions.item_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create versions for their items"
    ON item_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM items i
            JOIN projects p ON i.project_id = p.id
            WHERE i.id = item_versions.item_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete versions of their items"
    ON item_versions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM items i
            JOIN projects p ON i.project_id = p.id
            WHERE i.id = item_versions.item_id
            AND p.user_id = auth.uid()
        )
    );
