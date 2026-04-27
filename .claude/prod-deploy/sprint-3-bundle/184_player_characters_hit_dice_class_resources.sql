-- 184_player_characters_hit_dice_class_resources.sql
--
-- Adds two JSONB columns to `player_characters` so the A4 Player HQ
-- header can render real data instead of em-dash placeholders.
--
-- Why JSONB instead of separate numeric columns:
--   - `hit_dice` is a 2-field struct ({max, used}); keeping it bundled
--     mirrors the existing `spell_slots` pattern (line 137 of database.ts:
--     `spell_slots: Record<string, { max: number; used: number }>`).
--   - `class_resources` needs to be flexible across classes: Channel
--     Divinity (Cleric, 1-3/long), Ki (Monk, N/short), Sorcery Points
--     (Sorcerer, N/long), Rages (Barbarian, N/long), etc. Some classes
--     have multiple primary resources (e.g. Warlock: pact slots + two
--     Invocations bonus). JSONB future-proofs without schema churn.
--
-- Both columns get NOT NULL + default empty struct so existing rows get
-- safe values without app code having to handle null explicitly.
--
-- Backfill: a follow-up app-level job can derive `hit_dice.max = level`
-- for existing characters once classes know their hit-die size. For now
-- the defaults render as "HD —" / "CD —" which matches the A4 PR's
-- current em-dash placeholder behavior (Spec 13.1 "x=0 muta label pra
-- muted" extended to "data missing").

BEGIN;

ALTER TABLE player_characters
  ADD COLUMN IF NOT EXISTS hit_dice JSONB NOT NULL DEFAULT '{"max": 0, "used": 0}'::jsonb,
  ADD COLUMN IF NOT EXISTS class_resources JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN player_characters.hit_dice IS
  'Hit Dice tracker — JSONB {max: number, used: number}. Max usually = character level; used increments when player burns a die on a short rest and decrements on long rest. Default {0,0} means data not yet tracked (A4 header shows em-dash).';

COMMENT ON COLUMN player_characters.class_resources IS
  'Class-specific primary resources — JSONB. Canonical shape: {primary: {name: string, max: number, used: number}, ...}. Flexible to support multi-resource classes. Default {} means data not yet tracked (A4 header shows em-dash).';

-- Optional soundness check: ensure JSONB payloads keep their object shape.
-- (Not a hard constraint — app code is the source of truth for JSON shape;
-- check keeps grossly malformed rows out, doesn't enforce key presence.)
--
-- Guarded with DO blocks so re-running the migration locally (e.g.
-- supabase reset) doesn't fail on duplicate constraint names. Postgres
-- doesn't support `ADD CONSTRAINT IF NOT EXISTS` for named CHECK
-- constraints, so the DO/EXCEPTION pattern is the idiomatic fallback.
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

COMMIT;
