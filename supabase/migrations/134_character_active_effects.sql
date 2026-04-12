-- Active Effects: persistent spell/consumable tracking across sessions
-- Duration is in-game time (reference only), dismiss is always manual

CREATE TABLE character_active_effects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  effect_type         TEXT NOT NULL DEFAULT 'spell'
                      CHECK (effect_type IN ('spell','consumable','potion','item','other')),
  spell_level         INTEGER,
  is_concentration    BOOLEAN DEFAULT false,
  duration_minutes    INTEGER,
  quantity            INTEGER DEFAULT 1,
  notes               TEXT,
  source              TEXT,
  cast_by             UUID REFERENCES auth.users(id),
  is_active           BOOLEAN DEFAULT true,
  dismissed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_active_effects_char_active
  ON character_active_effects (player_character_id, is_active)
  WHERE is_active = true;

ALTER TABLE character_active_effects ENABLE ROW LEVEL SECURITY;

-- Player: full control on own character's effects
CREATE POLICY character_active_effects_owner
  ON character_active_effects FOR ALL
  USING (EXISTS (
    SELECT 1 FROM player_characters pc
    WHERE pc.id = character_active_effects.player_character_id
    AND pc.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM player_characters pc
    WHERE pc.id = character_active_effects.player_character_id
    AND pc.user_id = auth.uid()
  ));

-- DM: full control on all campaign characters' effects
CREATE POLICY character_active_effects_dm_manage
  ON character_active_effects FOR ALL
  USING (EXISTS (
    SELECT 1 FROM player_characters pc
    JOIN campaigns c ON c.id = pc.campaign_id
    WHERE pc.id = character_active_effects.player_character_id
    AND c.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM player_characters pc
    JOIN campaigns c ON c.id = pc.campaign_id
    WHERE pc.id = character_active_effects.player_character_id
    AND c.owner_id = auth.uid()
  ));
