-- ============================================
-- Database Schema for Project File Manager
-- Supabase (PostgreSQL)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

-- Item type enum (file or folder)
CREATE TYPE item_type AS ENUM ('file', 'folder');

-- ============================================
-- TABLES
-- ============================================

-- Projects table
-- Each project has a name that becomes the root folder
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT projects_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 255)
);

-- Items table (files and folders)
-- parent_id NULL means item is at project root level
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type item_type NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT items_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT items_sort_order_positive CHECK (sort_order >= 0),
    -- Prevent circular references (parent can't be self)
    CONSTRAINT items_no_self_parent CHECK (parent_id IS NULL OR parent_id != id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Index for fetching items by project
CREATE INDEX idx_items_project_id ON items(project_id);

-- Index for fetching children of a parent
CREATE INDEX idx_items_parent_id ON items(parent_id);

-- Index for sorting items within a parent
CREATE INDEX idx_items_parent_sort ON items(project_id, parent_id, sort_order);

-- Index for user's projects
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get next sort order for items in a parent
CREATE OR REPLACE FUNCTION get_next_sort_order(p_project_id UUID, p_parent_id UUID)
RETURNS INTEGER AS $$
DECLARE
    max_order INTEGER;
BEGIN
    SELECT COALESCE(MAX(sort_order), -1) + 1 INTO max_order
    FROM items
    WHERE project_id = p_project_id
    AND (
        (p_parent_id IS NULL AND parent_id IS NULL)
        OR parent_id = p_parent_id
    );
    RETURN max_order;
END;
$$ LANGUAGE plpgsql;

-- Function to check if moving item would create circular reference
CREATE OR REPLACE FUNCTION check_circular_reference(p_item_id UUID, p_new_parent_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_id UUID;
BEGIN
    IF p_new_parent_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    current_id := p_new_parent_id;
    
    WHILE current_id IS NOT NULL LOOP
        IF current_id = p_item_id THEN
            RETURN TRUE;
        END IF;
        SELECT parent_id INTO current_id FROM items WHERE id = current_id;
    END LOOP;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to prevent circular references on update
CREATE OR REPLACE FUNCTION prevent_circular_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NOT NULL AND check_circular_reference(NEW.id, NEW.parent_id) THEN
        RAISE EXCEPTION 'Circular reference detected: cannot move folder into its own descendant';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at for projects
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for items
CREATE TRIGGER trigger_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Prevent circular references when moving items
CREATE TRIGGER trigger_items_circular_check
    BEFORE UPDATE OF parent_id ON items
    FOR EACH ROW
    WHEN (OLD.parent_id IS DISTINCT FROM NEW.parent_id)
    EXECUTE FUNCTION prevent_circular_reference();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON projects FOR DELETE
    USING (auth.uid() = user_id);

-- Items policies (based on project ownership)
CREATE POLICY "Users can view items in their projects"
    ON items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = items.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create items in their projects"
    ON items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = items.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update items in their projects"
    ON items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = items.project_id
            AND projects.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = items.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete items in their projects"
    ON items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = items.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View to get items with full path (for breadcrumbs, etc.)
CREATE OR REPLACE VIEW items_with_path AS
WITH RECURSIVE item_path AS (
    -- Base case: items at root level
    SELECT 
        id,
        project_id,
        parent_id,
        name,
        type,
        sort_order,
        created_at,
        updated_at,
        name AS path,
        1 AS depth
    FROM items
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- Recursive case: items with parents
    SELECT 
        i.id,
        i.project_id,
        i.parent_id,
        i.name,
        i.type,
        i.sort_order,
        i.created_at,
        i.updated_at,
        ip.path || '/' || i.name AS path,
        ip.depth + 1 AS depth
    FROM items i
    INNER JOIN item_path ip ON i.parent_id = ip.id
)
SELECT * FROM item_path;

-- ============================================
-- SAMPLE QUERIES
-- ============================================

-- Example: Get all items in a project with hierarchy
-- SELECT * FROM items WHERE project_id = 'your-project-id' ORDER BY parent_id NULLS FIRST, sort_order;

-- Example: Get direct children of a folder
-- SELECT * FROM items WHERE project_id = 'your-project-id' AND parent_id = 'folder-id' ORDER BY sort_order;

-- Example: Get root-level items of a project
-- SELECT * FROM items WHERE project_id = 'your-project-id' AND parent_id IS NULL ORDER BY sort_order;

-- Example: Move item to new parent
-- UPDATE items SET parent_id = 'new-parent-id', sort_order = get_next_sort_order('project-id', 'new-parent-id') WHERE id = 'item-id';

-- Example: Reorder items (move item to position 2)
-- UPDATE items SET sort_order = 2 WHERE id = 'item-id';
-- UPDATE items SET sort_order = sort_order + 1 WHERE parent_id = 'parent-id' AND sort_order >= 2 AND id != 'item-id';

