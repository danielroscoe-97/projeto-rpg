-- Campaign quest board
CREATE TABLE campaign_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'active', 'completed')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_quests_campaign ON campaign_quests(campaign_id);

ALTER TABLE campaign_quests ENABLE ROW LEVEL SECURITY;

-- DM can manage quests in their campaigns
CREATE POLICY campaign_quests_dm_all ON campaign_quests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_quests.campaign_id
      AND campaigns.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_quests.campaign_id
      AND campaigns.owner_id = auth.uid()
    )
  );

-- Players can view quests in campaigns they belong to
CREATE POLICY campaign_quests_player_select ON campaign_quests
  FOR SELECT USING (public.is_campaign_member(campaign_id));

-- Auto-update updated_at
CREATE TRIGGER set_campaign_quests_updated_at
  BEFORE UPDATE ON campaign_quests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
