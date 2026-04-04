-- Campaign locations for world-building and mind map
CREATE TABLE campaign_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  location_type text NOT NULL DEFAULT 'building',
  parent_location_id uuid REFERENCES campaign_locations(id) ON DELETE SET NULL,
  is_discovered boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT campaign_locations_type_check
    CHECK (location_type IN ('city', 'dungeon', 'wilderness', 'building', 'region'))
);

CREATE INDEX idx_campaign_locations_campaign ON campaign_locations (campaign_id);
CREATE INDEX idx_campaign_locations_parent ON campaign_locations (parent_location_id);

-- Auto-update updated_at
CREATE TRIGGER set_campaign_locations_updated_at
  BEFORE UPDATE ON campaign_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE campaign_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign owner can manage locations"
  ON campaign_locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_locations.campaign_id
      AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Campaign members can view discovered locations"
  ON campaign_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = campaign_locations.campaign_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
    )
    AND (
      is_discovered = true
      OR EXISTS (
        SELECT 1 FROM campaigns c
        WHERE c.id = campaign_locations.campaign_id
        AND c.owner_id = auth.uid()
      )
    )
  );
