-- ============================================================================
-- Migration 149: Player <-> DM notes visibility (Wave 4 — Beta F01 + F02)
-- Renumbered from spec #142 (numbers 142-148 already in use by
-- player-identity and entity-graph waves).
--
-- Adds `visibility` to player_journal_entries (default 'private').
-- Adds `visibility` + `target_character_id` to campaign_notes for DM->player
-- targeted notes. Expands RLS so DM reads `shared_with_dm` entries and
-- targeted player reads `dm_private_to_player` entries.
--
-- `campaign_notes.is_shared` kept for backward compat (removal in Wave 6).
-- Backfill: is_shared=true -> 'campaign_public', false -> 'private'.
--
-- Invariants (see docs/SPEC-player-notes-visibility.md §2.3):
--   DM    = campaigns.owner_id = auth.uid()
--   Owner = player_characters.user_id = auth.uid()
-- ============================================================================

-- 1. player_journal_entries.visibility ---------------------------------------
ALTER TABLE player_journal_entries
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

ALTER TABLE player_journal_entries
  DROP CONSTRAINT IF EXISTS player_journal_entries_visibility_check;

ALTER TABLE player_journal_entries
  ADD CONSTRAINT player_journal_entries_visibility_check
  CHECK (visibility IN ('private', 'shared_with_dm'));

CREATE INDEX IF NOT EXISTS idx_journal_campaign_visibility
  ON player_journal_entries (campaign_id, visibility);

-- 2. campaign_notes.visibility + target_character_id -------------------------
ALTER TABLE campaign_notes
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'campaign_public';

ALTER TABLE campaign_notes
  ADD COLUMN IF NOT EXISTS target_character_id UUID
  REFERENCES player_characters(id) ON DELETE CASCADE;

-- Backfill from legacy is_shared (migration 042) -----------------------------
-- NOTE: only rows that still hold the default 'campaign_public' are rewritten,
-- so re-running the migration is idempotent and keeps later explicit writes.
UPDATE campaign_notes
   SET visibility = CASE WHEN is_shared THEN 'campaign_public' ELSE 'private' END
 WHERE visibility = 'campaign_public';

ALTER TABLE campaign_notes
  DROP CONSTRAINT IF EXISTS campaign_notes_visibility_check;

ALTER TABLE campaign_notes
  ADD CONSTRAINT campaign_notes_visibility_check
  CHECK (visibility IN ('private', 'campaign_public', 'dm_private_to_player'));

ALTER TABLE campaign_notes
  DROP CONSTRAINT IF EXISTS campaign_notes_target_check;

ALTER TABLE campaign_notes
  ADD CONSTRAINT campaign_notes_target_check
  CHECK (
    (visibility = 'dm_private_to_player' AND target_character_id IS NOT NULL)
    OR (visibility <> 'dm_private_to_player' AND target_character_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_campaign_notes_target
  ON campaign_notes (target_character_id)
  WHERE target_character_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_notes_campaign_visibility
  ON campaign_notes (campaign_id, visibility);

-- 3. RLS -- player_journal_entries -------------------------------------------
-- Drop the legacy monolithic policy so we can split into explicit op policies
-- that only widen SELECT for the DM while leaving write paths author-only.
DROP POLICY IF EXISTS journal_owner_only ON player_journal_entries;

DROP POLICY IF EXISTS journal_author_select ON player_journal_entries;
CREATE POLICY journal_author_select ON player_journal_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_journal_entries.player_character_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS journal_dm_select_shared ON player_journal_entries;
CREATE POLICY journal_dm_select_shared ON player_journal_entries
  FOR SELECT USING (
    visibility = 'shared_with_dm'
    AND EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = player_journal_entries.campaign_id
        AND campaigns.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS journal_author_insert ON player_journal_entries;
CREATE POLICY journal_author_insert ON player_journal_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_journal_entries.player_character_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS journal_author_update ON player_journal_entries;
CREATE POLICY journal_author_update ON player_journal_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_journal_entries.player_character_id
        AND user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_journal_entries.player_character_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS journal_author_delete ON player_journal_entries;
CREATE POLICY journal_author_delete ON player_journal_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_journal_entries.player_character_id
        AND user_id = auth.uid()
    )
  );

-- 4. RLS -- campaign_notes (add targeted-player read + visibility alias) -----
-- The existing DM-ALL policy ("DM can manage own campaign notes", migration 030)
-- and the campaign-wide shared-read policy remain, so DMs keep full ownership
-- of their rows. We add:
--   * campaign_notes_target_player_select -> player-alvo reads DM private note
--   * campaign_notes_shared_read          -> widened to accept either
--                                             is_shared=true OR visibility=
--                                             'campaign_public' during
--                                             transition (is_shared drop = W6).
DROP POLICY IF EXISTS campaign_notes_target_player_select ON campaign_notes;
CREATE POLICY campaign_notes_target_player_select ON campaign_notes
  FOR SELECT USING (
    visibility = 'dm_private_to_player'
    AND target_character_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = campaign_notes.target_character_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "campaign_notes_shared_read" ON campaign_notes;
CREATE POLICY "campaign_notes_shared_read" ON campaign_notes
  FOR SELECT USING (
    (is_shared = true OR visibility = 'campaign_public')
    AND public.is_campaign_member(campaign_id)
  );
