-- 020_campaign_invites.sql
-- Story 4.3: Campaign email invites

CREATE TABLE campaign_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_campaign_invites_campaign ON campaign_invites(campaign_id);
CREATE INDEX idx_campaign_invites_token ON campaign_invites(token);
CREATE INDEX idx_campaign_invites_email ON campaign_invites(email);

ALTER TABLE campaign_invites ENABLE ROW LEVEL SECURITY;

-- DM can manage invites they sent
CREATE POLICY campaign_invites_dm_all ON campaign_invites
  FOR ALL USING (auth.uid() = invited_by);

-- Public can read by token (for invite validation — app layer filters)
CREATE POLICY campaign_invites_read_by_token ON campaign_invites
  FOR SELECT USING (true);
