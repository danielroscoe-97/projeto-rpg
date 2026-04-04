-- ============================================================================
-- 091: Encounter Presets (campaign-scoped, DM-only)
-- Supports F-01/F-02 of the Encounter Builder epic
-- ============================================================================

-- Presets table
CREATE TABLE encounter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  notes TEXT,
  difficulty TEXT CHECK (difficulty IS NULL OR difficulty IN ('trivial','easy','medium','hard','deadly')),
  total_xp INT,
  adjusted_xp INT,
  selected_members UUID[] DEFAULT '{}',
  formula_version TEXT NOT NULL DEFAULT '2014' CHECK (formula_version IN ('2014','2024')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ,
  used_count INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_encounter_presets_campaign ON encounter_presets(campaign_id);

-- Junction table for preset creatures
CREATE TABLE encounter_preset_creatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id UUID NOT NULL REFERENCES encounter_presets(id) ON DELETE CASCADE,
  monster_slug TEXT,
  name TEXT NOT NULL,
  cr TEXT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  source TEXT DEFAULT 'srd' CHECK (source IN ('srd','srd-2024','mad','manual')),
  sort_order INT DEFAULT 0
);

CREATE INDEX idx_preset_creatures_preset ON encounter_preset_creatures(preset_id);

-- RLS
ALTER TABLE encounter_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_preset_creatures ENABLE ROW LEVEL SECURITY;

-- P2: DM manages presets via campaign ownership (WITH CHECK for INSERT/UPDATE)
CREATE POLICY "DM manages encounter presets" ON encounter_presets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = encounter_presets.campaign_id
      AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = encounter_presets.campaign_id
      AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "DM manages preset creatures" ON encounter_preset_creatures
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM encounter_presets ep
      JOIN campaigns c ON c.id = ep.campaign_id
      WHERE ep.id = encounter_preset_creatures.preset_id
      AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM encounter_presets ep
      JOIN campaigns c ON c.id = ep.campaign_id
      WHERE ep.id = encounter_preset_creatures.preset_id
      AND c.owner_id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE TRIGGER trg_encounter_presets_updated_at
  BEFORE UPDATE ON encounter_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- P3: RPC to atomically increment usage counter
CREATE OR REPLACE FUNCTION increment_preset_usage(p_preset_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE encounter_presets
  SET used_count = used_count + 1,
      used_at = now()
  WHERE id = p_preset_id;
$$;
