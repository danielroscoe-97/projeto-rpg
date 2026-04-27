-- 185_backfill_hit_dice_and_sync_class_resources.sql
--
-- Sprint 3 Track A · PR 6 (paired with story A4).
--
-- Migration 184 added `hit_dice` + `class_resources` JSONB columns on
-- `player_characters`, defaulting to `{"max":0,"used":0}` and `{}` so
-- the A4 Player HQ header still renders the muted em-dash for legacy
-- rows that were never edited. With the A4 PR (#68) wired to read those
-- columns, we now backfill the most common case so existing players
-- start seeing real values without manual editing.
--
-- 5e Hit Dice rule: a character's pool of Hit Dice equals their level
-- (1d<class hit die> per level). Reset rules differ by class but the
-- POOL SIZE is universally `level`. The hit-die FACE (1d6/1d8/1d10/1d12)
-- depends on class and is rendered separately by the sheet — this
-- backfill only sets `max = level, used = 0`, which is the safe
-- "fully rested" baseline.
--
-- IDEMPOTENT: only updates rows where:
--   - `hit_dice` is the original sentinel `{max:0,used:0}` OR null, AND
--   - `level` is set and > 0
-- Re-running the migration after a player has manually adjusted their
-- pool (or after a long rest) leaves their data untouched.
--
-- ROLLBACK: there is no destructive change. To undo, run:
--   UPDATE player_characters
--      SET hit_dice = '{"max":0,"used":0}'::jsonb
--    WHERE hit_dice IS NOT NULL AND level IS NOT NULL;
-- (Reverts every row to the migration-184 default.)
--
-- DEFERRED — class_resources sync trigger:
-- The original PR brief asked for a Postgres trigger that mirrors
-- `character_resource_trackers` rows into `player_characters.class_resources.primary`
-- whenever a tracker is updated. After reviewing migration 057
-- (character_resource_trackers schema) and migration 184
-- (class_resources spec), there is **no canonical "primary" field**
-- on the trackers table — only `display_order` (default 0) and
-- `created_at`. Inferring primary from `MIN(display_order)` or
-- `ORDER BY created_at LIMIT 1` makes assumptions that may not hold
-- (e.g. a Cleric with both Channel Divinity and Divine Intervention
-- could have either as "primary" depending on level).
--
-- Per the Track A brief ("If unclear, leave the trigger as TODO and
-- just ship the backfill — flag this in PR description for human
-- review"), the trigger is intentionally NOT included here. Winston
-- review required to define primary semantics — likely options:
--   (a) add `is_primary BOOLEAN DEFAULT false` to character_resource_trackers
--       with a partial unique index per character
--   (b) use `display_order = 0` as primary (requires app-level discipline)
--   (c) keep app-level mirror only (no DB trigger; setRechargeState etc.
--       writes to both tables explicitly)
--
-- Option (a) is the safest long-term choice. Punted to a follow-up PR.

BEGIN;

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
