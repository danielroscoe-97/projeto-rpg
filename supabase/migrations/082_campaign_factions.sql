-- Campaign factions for world-building and mind map
CREATE TABLE campaign_factions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  alignment text NOT NULL DEFAULT 'neutral',
  is_visible_to_players boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT campaign_factions_alignment_check
    CHECK (alignment IN ('ally', 'neutral', 'hostile'))
);

CREATE INDEX idx_campaign_factions_campaign ON campaign_factions (campaign_id);

-- Auto-update updated_at
CREATE TRIGGER set_campaign_factions_updated_at
  BEFORE UPDATE ON campaign_factions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE campaign_factions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign owner can manage factions"
  ON campaign_factions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_factions.campaign_id
      AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Campaign members can view visible factions"
  ON campaign_factions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members cm
      WHERE cm.campaign_id = campaign_factions.campaign_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
    )
    AND (
      is_visible_to_players = true
      OR EXISTS (
        SELECT 1 FROM campaigns c
        WHERE c.id = campaign_factions.campaign_id
        AND c.owner_id = auth.uid()
      )
    )
  );
