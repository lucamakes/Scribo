-- Migration: Add soft delete (trash) functionality
-- This adds a deleted_at column to items table for soft delete
-- and creates a scheduled function to auto-delete items after 14 days

-- 1. Add deleted_at column to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create index for efficient trash queries
CREATE INDEX IF NOT EXISTS idx_items_deleted_at ON items (deleted_at);
CREATE INDEX IF NOT EXISTS idx_items_project_deleted ON items (project_id, deleted_at);

-- 3. Update RLS policies to handle deleted items
-- Users should only see non-deleted items in normal queries
-- but should be able to access their own deleted items for trash view

-- 4. Create function to permanently delete old trash items (14 days)
CREATE OR REPLACE FUNCTION cleanup_old_trash_items()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM items 
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '14 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 5. Create function to restore an item (clear deleted_at)
CREATE OR REPLACE FUNCTION restore_item(item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Restore the item
  UPDATE items SET deleted_at = NULL WHERE id = item_id;
  
  -- Also restore all children recursively
  WITH RECURSIVE descendants AS (
    SELECT id FROM items WHERE parent_id = item_id
    UNION ALL
    SELECT i.id FROM items i
    INNER JOIN descendants d ON i.parent_id = d.id
  )
  UPDATE items SET deleted_at = NULL WHERE id IN (SELECT id FROM descendants);
END;
$$;

-- 6. Create function to soft delete an item and its children
CREATE OR REPLACE FUNCTION soft_delete_item(item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_time TIMESTAMPTZ := NOW();
BEGIN
  -- Soft delete the item
  UPDATE items SET deleted_at = current_time WHERE id = item_id;
  
  -- Also soft delete all children recursively
  WITH RECURSIVE descendants AS (
    SELECT id FROM items WHERE parent_id = item_id
    UNION ALL
    SELECT i.id FROM items i
    INNER JOIN descendants d ON i.parent_id = d.id
  )
  UPDATE items SET deleted_at = current_time WHERE id IN (SELECT id FROM descendants);
END;
$$;

-- Note: For automatic cleanup every day, you would need to set up:
-- Option A: Supabase pg_cron extension (if available)
-- SELECT cron.schedule('cleanup-trash', '0 3 * * *', 'SELECT cleanup_old_trash_items()');
--
-- Option B: An external cron job or Supabase Edge Function scheduled to call:
-- SELECT cleanup_old_trash_items();
--
-- Option C: Call cleanup on each trash view load (client-side trigger)

COMMENT ON FUNCTION cleanup_old_trash_items() IS 'Permanently deletes items that have been in trash for more than 14 days. Should be called periodically.';
