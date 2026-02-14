-- Migration: Enhanced Journal Tracking for Spell Performances
-- Date: 2026-02-14
-- Description: Add mood tracking, intention, effectiveness, and privacy fields to journal_entries

-- Add new columns for enhanced tracking
ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS mood_before TEXT,
ADD COLUMN IF NOT EXISTS mood_after TEXT,
ADD COLUMN IF NOT EXISTS intention TEXT,
ADD COLUMN IF NOT EXISTS would_do_again BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for privacy filtering (for future community features)
CREATE INDEX IF NOT EXISTS idx_journal_entries_is_private
ON journal_entries(is_private);

-- Create index for would_do_again filtering (for recommendations)
CREATE INDEX IF NOT EXISTS idx_journal_entries_would_do_again
ON journal_entries(would_do_again)
WHERE would_do_again IS NOT NULL;

-- Add helpful column comments
COMMENT ON COLUMN journal_entries.mood_before IS 'User mood before performing spell (free text or 1-10 scale)';
COMMENT ON COLUMN journal_entries.mood_after IS 'User mood after performing spell (free text or 1-10 scale)';
COMMENT ON COLUMN journal_entries.intention IS 'User intention or what they hoped the spell would do';
COMMENT ON COLUMN journal_entries.rating IS 'Effectiveness rating 1-5 stars (renamed from generic rating)';
COMMENT ON COLUMN journal_entries.would_do_again IS 'Whether user would perform this spell again (yes/no)';
COMMENT ON COLUMN journal_entries.is_private IS 'Privacy flag for future community/sharing features';
COMMENT ON COLUMN journal_entries.updated_at IS 'Timestamp for when entry was last updated';

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journal_entries_updated_at_trigger ON journal_entries;

CREATE TRIGGER journal_entries_updated_at_trigger
BEFORE UPDATE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION update_journal_entries_updated_at();

-- Verification query (uncomment to check results)
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'journal_entries'
-- ORDER BY ordinal_position;
