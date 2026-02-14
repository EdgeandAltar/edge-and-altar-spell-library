-- Verification Script for Enhanced Journal Tracking
-- Run this to verify the migration was successful

-- 1. Check that all new columns exist
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'journal_entries'
  AND column_name IN (
    'mood_before',
    'mood_after',
    'intention',
    'would_do_again',
    'is_private',
    'updated_at'
  )
ORDER BY column_name;

-- Expected output: 6 rows showing the new columns

-- 2. Check that indexes were created
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'journal_entries'
  AND indexname IN (
    'idx_journal_entries_is_private',
    'idx_journal_entries_would_do_again'
  );

-- Expected output: 2 rows showing the new indexes

-- 3. Check that the trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'journal_entries'
  AND trigger_name = 'journal_entries_updated_at_trigger';

-- Expected output: 1 row showing the trigger

-- 4. Check column comments (helpful documentation)
SELECT
  col.column_name,
  pgd.description
FROM pg_catalog.pg_statio_all_tables st
INNER JOIN pg_catalog.pg_description pgd ON (
  pgd.objoid = st.relid
)
INNER JOIN information_schema.columns col ON (
  pgd.objsubid = col.ordinal_position
  AND col.table_schema = st.schemaname
  AND col.table_name = st.relname
)
WHERE st.relname = 'journal_entries'
  AND col.column_name IN (
    'mood_before',
    'mood_after',
    'intention',
    'rating',
    'would_do_again',
    'is_private',
    'updated_at'
  )
ORDER BY col.column_name;

-- Expected output: 7 rows with helpful descriptions

-- 5. Test that updated_at trigger works
-- First, find a test journal entry (or create one)
-- Then update it and verify updated_at changed:
--
-- UPDATE journal_entries
-- SET notes = 'Test update'
-- WHERE id = 'YOUR_TEST_ID';
--
-- SELECT id, created_at, updated_at
-- FROM journal_entries
-- WHERE id = 'YOUR_TEST_ID';
--
-- updated_at should be more recent than created_at

-- 6. Sample query to test the new fields work
-- (Uncomment and modify user_id to test with real data)
--
-- SELECT
--   spell_title,
--   entry_date,
--   rating,
--   mood_before,
--   mood_after,
--   intention,
--   would_do_again,
--   is_private,
--   tags
-- FROM journal_entries
-- WHERE user_id = 'YOUR_USER_ID_HERE'
-- ORDER BY entry_date DESC
-- LIMIT 5;

-- 7. Check RLS policies are still in place
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'journal_entries';

-- Expected output: All existing RLS policies should still be present

-- ✅ All checks passed? You're ready to use the enhanced journal tracking!
