-- Stream D: Character Spells (personal spell list per character)
-- Player manages their spell list: add from compendium or manual, mark prepared/favorite

CREATE TABLE character_spells (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id  UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  spell_name           TEXT NOT NULL,
  spell_level          INTEGER NOT NULL DEFAULT 0
    CHECK (spell_level BETWEEN 0 AND 9),
  school               TEXT,
  description_short    TEXT,
  compendium_ref       TEXT,
  status               TEXT NOT NULL DEFAULT 'known'
    CHECK (status IN ('known', 'prepared', 'favorite')),
  is_concentration     BOOLEAN NOT NULL DEFAULT false,
  is_ritual            BOOLEAN NOT NULL DEFAULT false,
  casting_time         TEXT,
  range_text           TEXT,
  components           TEXT,
  duration             TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_character_spells_character ON character_spells(player_character_id, spell_level);

ALTER TABLE character_spells ENABLE ROW LEVEL SECURITY;

-- Player manages own spells
CREATE POLICY character_spells_owner ON character_spells
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = character_spells.player_character_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = character_spells.player_character_id
      AND user_id = auth.uid()
    )
  );

-- DM can read spells of characters in their campaigns
CREATE POLICY character_spells_dm_read ON character_spells
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM player_characters pc
      JOIN campaigns c ON c.id = pc.campaign_id
      WHERE pc.id = character_spells.player_character_id
      AND c.owner_id = auth.uid()
    )
  );
