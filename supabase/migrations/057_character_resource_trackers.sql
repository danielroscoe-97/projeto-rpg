-- 057_character_resource_trackers.sql
-- Player HQ Sprint 1: generic resource trackers (Ki, Wild Shape, Rage, etc.)

CREATE TABLE character_resource_trackers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  max_uses            INTEGER NOT NULL DEFAULT 1,
  current_uses        INTEGER NOT NULL DEFAULT 0,
  reset_type          TEXT NOT NULL DEFAULT 'long_rest'
    CHECK (reset_type IN ('short_rest', 'long_rest', 'dawn', 'manual')),
  source              TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('srd', 'manual')),
  srd_ref             TEXT,
  display_order       INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  -- C-M2 fix: removed current_uses <= max_uses CHECK to allow atomic max_uses reduction
  -- Clamping is done at application level instead
  CONSTRAINT max_uses_positive CHECK (max_uses >= 1),
  CONSTRAINT current_uses_non_negative CHECK (current_uses >= 0)
);

CREATE INDEX idx_resource_trackers_character ON character_resource_trackers(player_character_id);

-- C-M3 fix: auto-update updated_at on modification
CREATE OR REPLACE FUNCTION update_resource_tracker_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_resource_tracker_updated_at
  BEFORE UPDATE ON character_resource_trackers
  FOR EACH ROW EXECUTE FUNCTION update_resource_tracker_timestamp();

ALTER TABLE character_resource_trackers ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY resource_trackers_owner ON character_resource_trackers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = character_resource_trackers.player_character_id
      AND pc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters pc
      WHERE pc.id = character_resource_trackers.player_character_id
      AND pc.user_id = auth.uid()
    )
  );

-- I-05 fix: DM can read + update + delete trackers for their campaign
CREATE POLICY resource_trackers_dm_manage ON character_resource_trackers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters pc
      JOIN campaigns c ON c.id = pc.campaign_id
      WHERE pc.id = character_resource_trackers.player_character_id
      AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_characters pc
      JOIN campaigns c ON c.id = pc.campaign_id
      WHERE pc.id = character_resource_trackers.player_character_id
      AND c.owner_id = auth.uid()
    )
  );
