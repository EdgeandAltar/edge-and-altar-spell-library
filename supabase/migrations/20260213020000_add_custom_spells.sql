-- Migration: Add Custom Spells Feature
-- Date: 2026-02-13
-- Description: Adds support for user-created custom spells with RLS policies

-- Step 1: Add columns to spells table for custom spell support
ALTER TABLE spells
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_spells_created_by_user
ON spells(created_by_user_id)
WHERE created_by_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spells_is_custom
ON spells(is_custom)
WHERE is_custom = true;

-- Step 3: Enable Row Level Security on spells table
ALTER TABLE spells ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if any (to ensure clean state)
DROP POLICY IF EXISTS "Library spells are viewable by everyone" ON spells;
DROP POLICY IF EXISTS "Users can view their own custom spells" ON spells;
DROP POLICY IF EXISTS "Users can create custom spells" ON spells;
DROP POLICY IF EXISTS "Users can update their own custom spells" ON spells;
DROP POLICY IF EXISTS "Users can delete their own custom spells" ON spells;
DROP POLICY IF EXISTS "Admins can manage library spells" ON spells;

-- Step 5: Create RLS policies

-- Policy 1: Everyone can read library spells (created_by_user_id IS NULL)
CREATE POLICY "Library spells are viewable by everyone"
  ON spells FOR SELECT
  USING (created_by_user_id IS NULL);

-- Policy 2: Users can read their own custom spells
CREATE POLICY "Users can view their own custom spells"
  ON spells FOR SELECT
  USING (created_by_user_id = auth.uid());

-- Policy 3: Users can insert their own custom spells
CREATE POLICY "Users can create custom spells"
  ON spells FOR INSERT
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND is_custom = true
  );

-- Policy 4: Users can update only their own custom spells
CREATE POLICY "Users can update their own custom spells"
  ON spells FOR UPDATE
  USING (created_by_user_id = auth.uid() AND is_custom = true)
  WITH CHECK (created_by_user_id = auth.uid() AND is_custom = true);

-- Policy 5: Users can delete only their own custom spells
CREATE POLICY "Users can delete their own custom spells"
  ON spells FOR DELETE
  USING (created_by_user_id = auth.uid() AND is_custom = true);

-- Policy 6: Admins can manage library spells (created_by_user_id IS NULL)
CREATE POLICY "Admins can manage library spells"
  ON spells FOR ALL
  USING (
    created_by_user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Step 6: Add helpful comments
COMMENT ON COLUMN spells.created_by_user_id IS 'NULL for library spells (admin-managed), user ID for custom user-created spells';
COMMENT ON COLUMN spells.is_custom IS 'True for user-created custom spells, false for library spells';
