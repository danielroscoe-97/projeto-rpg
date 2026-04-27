-- Sprint 3 bundle — verify (READ-ONLY).
-- Run AFTER 01_apply.sql to confirm both migrations landed.

-- 1) Both columns now exist with the right defaults
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'player_characters'
  AND column_name IN ('hit_dice', 'class_resources')
ORDER BY column_name;
-- Expect 2 rows. data_type = jsonb, is_nullable = NO, column_default present.

-- 2) Both CHECK constraints exist
SELECT
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.player_characters'::regclass
  AND conname IN (
    'player_characters_hit_dice_is_object',
    'player_characters_class_resources_is_object'
  )
ORDER BY conname;
-- Expect 2 rows.

-- 3) Backfill landed — count rows that now have non-sentinel hit_dice
SELECT
  COUNT(*) AS backfilled_rows,
  MIN((hit_dice->>'max')::int) AS min_hd_max,
  MAX((hit_dice->>'max')::int) AS max_hd_max
FROM player_characters
WHERE level IS NOT NULL
  AND level > 0
  AND hit_dice <> '{"max":0,"used":0}'::jsonb
  AND hit_dice <> '{"max": 0, "used": 0}'::jsonb;
-- Expect: backfilled_rows = number of player_characters with level > 0.
-- min_hd_max should be > 0; max_hd_max <= 20 in canonical 5e.

-- 4) Spot-check 5 rows so a human can eyeball
SELECT id, name, level, hit_dice, class_resources
  FROM player_characters
 WHERE level IS NOT NULL AND level > 0
 ORDER BY updated_at DESC NULLS LAST
 LIMIT 5;
-- Expect: hit_dice = {"max": <level>, "used": 0}; class_resources = {}.

-- 5) Sanity: no row violates the CHECK constraints (would have errored
--    on apply, but cheap to confirm)
SELECT COUNT(*) AS bad_hit_dice
  FROM player_characters
 WHERE jsonb_typeof(hit_dice) <> 'object'; -- expect 0

SELECT COUNT(*) AS bad_class_resources
  FROM player_characters
 WHERE jsonb_typeof(class_resources) <> 'object'; -- expect 0
