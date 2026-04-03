-- Stream B: Player Journal (private notes + session journal)
-- RLS: ONLY the owning player can read/write. DM has NO access.

CREATE TABLE player_journal_entries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id  UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  campaign_id          UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL DEFAULT 'quick_note'
    CHECK (type IN ('quick_note', 'journal', 'lore')),
  title                TEXT,
  content              TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_character_type ON player_journal_entries(player_character_id, type, created_at DESC);
CREATE INDEX idx_journal_campaign ON player_journal_entries(campaign_id);

ALTER TABLE player_journal_entries ENABLE ROW LEVEL SECURITY;

-- PRIVATE: only the owning player. DM has NO SELECT policy.
CREATE POLICY journal_owner_only ON player_journal_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_journal_entries.player_character_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_journal_entries.player_character_id
      AND user_id = auth.uid()
    )
  );

CREATE TRIGGER set_journal_updated_at
  BEFORE UPDATE ON player_journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
