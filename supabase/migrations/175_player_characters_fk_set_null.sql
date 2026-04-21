-- 175_player_characters_fk_set_null.sql
-- Fix data loss bug discovered during 2026-04-21 QA run.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- Bug: DM deleting a campaign silently destroys player characters
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Repro:
--   1. Player A creates a standalone character (campaign_id = NULL)
--   2. Player A accepts DM B's campaign invite → character.campaign_id is
--      set to that campaign
--   3. DM B deletes the campaign
--   4. Player A's character is GONE from player_characters
--
-- Root cause:
--   player_characters_campaign_id_fkey FOREIGN KEY (campaign_id)
--     REFERENCES campaigns(id) ON DELETE CASCADE
--
-- The cascade was fine when characters were campaign-owned (early model),
-- but `player_characters` has since become player-owned (user_id is the
-- source of truth, campaign_id is a nullable secondary link). Cascading on
-- campaign delete is now destructive across user boundaries: the DM's
-- campaign delete wipes the player's character regardless of whether the
-- player still wants the sheet for another table.
--
-- Fix: change the FK to ON DELETE SET NULL. When a campaign is deleted,
-- its player_characters rows are preserved but unlinked (campaign_id = NULL).
-- The player can re-link them to a new campaign via the join flow, or keep
-- them as standalone.
--
-- No data migration needed: existing rows are unaffected by the constraint
-- change. Drops and re-adds the constraint atomically (inside a transaction
-- wrapper provided by the migration runner).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE player_characters
  DROP CONSTRAINT IF EXISTS player_characters_campaign_id_fkey;

ALTER TABLE player_characters
  ADD CONSTRAINT player_characters_campaign_id_fkey
    FOREIGN KEY (campaign_id)
    REFERENCES campaigns(id)
    ON DELETE SET NULL;
