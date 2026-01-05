-- ============================================
-- Migration: Remove 'canvas' from item_type enum
-- ============================================

-- First, delete any existing canvas items
DELETE FROM items WHERE type = 'canvas';

-- Create new enum without canvas
CREATE TYPE item_type_new AS ENUM ('file', 'folder');

-- Update the table to use the new enum
ALTER TABLE items 
  ALTER COLUMN type TYPE item_type_new 
  USING type::text::item_type_new;

-- Drop the old enum and rename the new one
DROP TYPE item_type;
ALTER TYPE item_type_new RENAME TO item_type;

-- Note: This will permanently delete all canvas items from the database