-- F08 prod-deploy sanity (READ-ONLY).
-- Run BEFORE 01_apply.sql. Abort if any row deviates from the expected value.

-- 1) srd_full_access column should NOT exist yet (we're about to add it)
SELECT
  EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'campaign_settings'
       AND column_name = 'srd_full_access'
  ) AS srd_full_access_exists; -- expect: false

-- 2) campaign_settings table is in the expected shape
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'campaign_settings'
  AND column_name IN ('id', 'campaign_id', 'game_system', 'theme')
ORDER BY column_name; -- expect: 4 rows

-- 3) Last applied migration version (if the project tracks them)
SELECT version
  FROM supabase_migrations.schema_migrations
 ORDER BY version DESC
 LIMIT 5; -- expect: top entry < 188 (most likely 187_player_notes)
