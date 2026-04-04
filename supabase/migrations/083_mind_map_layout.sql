-- Persist mind map node positions per campaign
CREATE TABLE campaign_mind_map_layout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  node_key text NOT NULL, -- format: 'npc:<uuid>', 'quest:<uuid>', 'campaign', etc.
  x double precision NOT NULL DEFAULT 0,
  y double precision NOT NULL DEFAULT 0,
  is_collapsed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mind_map_layout_unique UNIQUE (campaign_id, node_key)
);

CREATE INDEX idx_mind_map_layout_campaign ON campaign_mind_map_layout (campaign_id);

-- RLS
ALTER TABLE campaign_mind_map_layout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign owner can manage layout"
  ON campaign_mind_map_layout FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_mind_map_layout.campaign_id
      AND c.owner_id = auth.uid()
    )
  );
