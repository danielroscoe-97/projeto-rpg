-- Sprint 3 bundle — sanity check (READ-ONLY)
--
-- Run this BEFORE 01_apply.sql to confirm the DB is in the expected
-- state. If any row returns the wrong value, abort and investigate.

-- 1) hit_dice column should NOT exist yet (we're about to add it)
SELECT
  EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'player_characters'
       AND column_name = 'hit_dice'
  ) AS hit_dice_exists; -- expect: false

-- 2) class_resources column should NOT exist yet
SELECT
  EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'player_characters'
       AND column_name = 'class_resources'
  ) AS class_resources_exists; -- expect: false

-- 3) Ensure player_characters has the columns we'll join against
SELECT
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'player_characters'
  AND column_name IN ('id', 'level', 'name')
ORDER BY column_name; -- expect: 3 rows (id, level, name)

-- 4) Count of player_characters rows that will get backfilled by 185
SELECT
  COUNT(*) AS backfill_target_count
FROM player_characters
WHERE level IS NOT NULL AND level > 0; -- informational

-- 5) Last applied migration in supabase_migrations.schema_migrations
--    (if Dashboard manages history; safe to ignore if your project
--    doesn't track this table)
SELECT version
  FROM supabase_migrations.schema_migrations
 ORDER BY version DESC
 LIMIT 5; -- expect: top entry < 184
