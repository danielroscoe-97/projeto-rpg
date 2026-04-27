-- Sprint 3 bundle — apply migrations 184 + 185 in one transaction.
--
-- This is a concatenation of:
--   supabase/migrations/184_player_characters_hit_dice_class_resources.sql
--   supabase/migrations/185_backfill_hit_dice_and_sync_class_resources.sql
--
-- Both are idempotent (ADD COLUMN IF NOT EXISTS, sentinel-guarded UPDATE).
-- Re-running this bundle is safe.
--
-- WHY THIS BUNDLE EXISTS:
--   PR #68 (A4 em-dash → real values) merged to master before 184/185
--   were applied to production. `useCharacterStatus` now SELECTs
--   `hit_dice, class_resources` — which fails with PostgREST 42703 on
--   any environment that doesn't have these columns yet. Apply this
--   bundle BEFORE the next Vercel deploy from master, or roll back #68.

BEGIN;

-- ===========================================================================
-- 184_player_characters_hit_dice_class_resources.sql
-- ===========================================================================

ALTER TABLE player_characters
  ADD COLUMN IF NOT EXISTS hit_dice JSONB NOT NULL DEFAULT '{"max": 0, "used": 0}'::jsonb,
  ADD COLUMN IF NOT EXISTS class_resources JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN player_characters.hit_dice IS
  'Hit Dice tracker — JSONB {max: number, used: number}. Max usually = character level; used increments when player burns a die on a short rest and decrements on long rest. Default {0,0} means data not yet tracked (A4 header shows em-dash).';

COMMENT ON COLUMN player_characters.class_resources IS
  'Class-specific primary resources — JSONB. Canonical shape: {primary: {name: string, max: number, used: number}, ...}. Flexible to support multi-resource classes. Default {} means data not yet tracked (A4 header shows em-dash).';

DO $$
BEGIN
  ALTER TABLE player_characters
    ADD CONSTRAINT player_characters_hit_dice_is_object
      CHECK (jsonb_typeof(hit_dice) = 'object');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE player_characters
    ADD CONSTRAINT player_characters_class_resources_is_object
      CHECK (jsonb_typeof(class_resources) = 'object');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================================================
-- 185_backfill_hit_dice_and_sync_class_resources.sql
-- ===========================================================================

UPDATE player_characters
   SET hit_dice = jsonb_build_object('max', level, 'used', 0)
 WHERE (
         hit_dice IS NULL
         OR hit_dice = '{"max":0,"used":0}'::jsonb
         OR hit_dice = '{"max": 0, "used": 0}'::jsonb
       )
   AND level IS NOT NULL
   AND level > 0;

COMMIT;
