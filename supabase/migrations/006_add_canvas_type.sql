-- ============================================
-- Migration: Add 'canvas' to item_type enum
-- ============================================

-- Add 'canvas' value to the item_type enum
ALTER TYPE item_type ADD VALUE 'canvas';

-- Note: In PostgreSQL, you cannot remove enum values once added.
-- The new enum will be: ('file', 'folder', 'canvas')
