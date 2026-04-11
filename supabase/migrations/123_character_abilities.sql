-- 123_character_abilities.sql
-- Epic: Character Abilities & Attunement — AB-01
-- Track class features, racial traits, feats, subclass features per character
-- with optional limited-use tracking (dots with short/long rest recharge)

CREATE TABLE character_abilities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  name_pt             TEXT,
  description         TEXT,
  description_pt      TEXT,
  ability_type        TEXT NOT NULL DEFAULT 'manual'
    CHECK (ability_type IN ('class_feature', 'racial_trait', 'feat', 'subclass_feature', 'manual')),
  source_class        TEXT,           -- e.g. 'barbarian', 'fighter'
  source_race         TEXT,           -- e.g. 'dwarf', 'elf'
  level_acquired      INTEGER,        -- character level when gained
  -- Resource tracking (nullable — passive abilities have no uses)
  max_uses            INTEGER,
  current_uses        INTEGER NOT NULL DEFAULT 0,
  reset_type          TEXT
    CHECK (reset_type IN ('short_rest', 'long_rest', 'dawn', 'manual') OR reset_type IS NULL),
  -- SRD link
  srd_ref             TEXT,           -- e.g. 'feat:lucky', 'class:barbarian:rage'
  source              TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('srd', 'manual')),
  display_order       INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT ability_max_uses_positive CHECK (max_uses IS NULL OR max_uses >= 1),
  CONSTRAINT ability_current_uses_non_negative CHECK (current_uses >= 0)
);

CREATE INDEX idx_character_abilities_character ON character_abilities(player_character_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_character_ability_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_character_ability_updated_at
  BEFORE UPDATE ON character_abilities
  FOR EACH ROW EXECUTE FUNCTION update_character_ability_timestamp();

ALTER TABLE character_abilities ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY character_abilities_owner ON character_abilities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = character_abilities.player_character_id
      AND pc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = character_abilities.player_character_id
      AND pc.user_id = auth.uid()
    )
  );

-- DM can read + manage abilities for their campaign members
CREATE POLICY character_abilities_dm_manage ON character_abilities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters pc
      JOIN campaigns c ON c.id = pc.campaign_id
      WHERE pc.id = character_abilities.player_character_id
      AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters pc
      JOIN campaigns c ON c.id = pc.campaign_id
      WHERE pc.id = character_abilities.player_character_id
      AND c.owner_id = auth.uid()
    )
  );
