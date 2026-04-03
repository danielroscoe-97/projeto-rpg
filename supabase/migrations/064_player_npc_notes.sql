-- Stream B: Player NPC Journal (personal NPC notes per character)
-- RLS: ONLY the owning player can read/write. DM has NO access.

CREATE TABLE player_npc_notes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id  UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  campaign_id          UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  npc_name             TEXT NOT NULL,
  relationship         TEXT NOT NULL DEFAULT 'unknown'
    CHECK (relationship IN ('ally', 'enemy', 'neutral', 'unknown')),
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- I-1: redundant simple index removed — the UNIQUE constraint below covers it
-- I-10: UNIQUE prevents duplicate NPC entries per character
ALTER TABLE player_npc_notes
  ADD CONSTRAINT uq_npc_notes_character_npc UNIQUE (player_character_id, npc_name);

ALTER TABLE player_npc_notes ENABLE ROW LEVEL SECURITY;

-- PRIVATE: only the owning player. DM has NO SELECT policy.
CREATE POLICY npc_notes_owner_only ON player_npc_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_npc_notes.player_character_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_npc_notes.player_character_id
      AND user_id = auth.uid()
    )
  );

CREATE TRIGGER set_npc_notes_updated_at
  BEFORE UPDATE ON player_npc_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
