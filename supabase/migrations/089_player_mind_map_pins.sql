-- Player personal pins on the mind map
CREATE TABLE player_mind_map_pins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  campaign_id         UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  label               TEXT NOT NULL DEFAULT '',
  note                TEXT NOT NULL DEFAULT '',
  color               TEXT NOT NULL DEFAULT 'amber'
    CHECK (color IN ('amber', 'blue', 'green', 'red', 'purple')),
  attached_to_node    TEXT,  -- format: 'npc:<uuid>', 'quest:<uuid>' (null = floating pin)
  position_x          DOUBLE PRECISION,
  position_y          DOUBLE PRECISION,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pins_character ON player_mind_map_pins(player_character_id);
CREATE INDEX idx_pins_campaign ON player_mind_map_pins(campaign_id);

ALTER TABLE player_mind_map_pins ENABLE ROW LEVEL SECURITY;

-- Player can only see/edit their own pins
CREATE POLICY pins_owner ON player_mind_map_pins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = player_mind_map_pins.player_character_id
      AND pc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = player_mind_map_pins.player_character_id
      AND pc.user_id = auth.uid()
    )
  );

-- DM can view all player pins (insight into player thinking)
CREATE POLICY pins_dm_read ON player_mind_map_pins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = player_mind_map_pins.campaign_id
      AND c.owner_id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE TRIGGER set_pins_updated_at
  BEFORE UPDATE ON player_mind_map_pins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
