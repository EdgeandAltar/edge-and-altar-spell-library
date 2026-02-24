-- Rename "Spring Equinox (March 20)" to "Ostara/Spring Equinox (March 20)" in seasonal_tags
-- This updates existing spells that have the old tag name

UPDATE spells
SET seasonal_tags = array_replace(seasonal_tags, 'Spring Equinox (March 20)', 'Ostara/Spring Equinox (March 20)')
WHERE 'Spring Equinox (March 20)' = ANY(seasonal_tags);
