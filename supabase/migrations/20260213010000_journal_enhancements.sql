-- Migration: Enhance journal_entries table for timeline feature
-- Date: 2026-02-13
-- Description: Add indexes for performance and ensure rating is nullable

-- Ensure rating column is explicitly nullable
-- (Allows quick-log entries without requiring a star rating)
ALTER TABLE journal_entries
ALTER COLUMN rating DROP NOT NULL;

-- Add index for timeline queries sorted by date
-- This dramatically improves performance when loading journal timeline
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date
ON journal_entries(user_id, entry_date DESC);

-- Add index for efficient date-based queries (moon phase correlations, filters)
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date
ON journal_entries(entry_date);

-- Add helpful column comments for future reference
COMMENT ON COLUMN journal_entries.rating IS 'Optional 1-5 star rating. NULL for quick-log entries without reflection.';
COMMENT ON COLUMN journal_entries.notes IS 'Optional notes about the spell performance. Empty string for quick-log entries.';

-- Verification query (uncomment to check results)
-- SELECT column_name, is_nullable, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'journal_entries' AND column_name IN ('rating', 'notes');
