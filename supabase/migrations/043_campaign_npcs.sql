-- Campaign NPCs
CREATE TABLE campaign_npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  stats JSONB DEFAULT '{}',
  avatar_url TEXT,
  is_visible_to_players BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE campaign_npcs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_campaign_npcs_campaign ON campaign_npcs(campaign_id);

-- RLS: Campaign owner has full CRUD
CREATE POLICY "campaign_npcs_owner" ON campaign_npcs
  FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE owner_id = auth.uid())
  );

-- RLS: Members see only visible NPCs
CREATE POLICY "campaign_npcs_member_read" ON campaign_npcs
  FOR SELECT USING (
    is_visible_to_players = true AND
    campaign_id IN (
      SELECT campaign_id FROM campaign_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
