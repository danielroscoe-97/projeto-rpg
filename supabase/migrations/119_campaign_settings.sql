-- Campaign settings for DM customization (DJ-A1/A3 support)
CREATE TABLE campaign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
  game_system TEXT DEFAULT '5e',
  party_level INTEGER,
  theme TEXT,
  description TEXT,
  is_oneshot BOOLEAN DEFAULT false,
  allow_spectators BOOLEAN DEFAULT false,
  max_players INTEGER DEFAULT 10,
  join_code_expires_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: owner full access, members read-only
ALTER TABLE campaign_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage settings"
ON campaign_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_settings.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Members can view settings"
ON campaign_settings FOR SELECT
USING (
  public.is_campaign_member(campaign_id)
);

-- Updated_at trigger (reuse existing function from 001_initial_schema)
CREATE TRIGGER set_campaign_settings_updated_at
  BEFORE UPDATE ON campaign_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
