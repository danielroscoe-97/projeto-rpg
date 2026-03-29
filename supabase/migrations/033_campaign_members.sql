-- 033_campaign_members.sql
-- Story A.1: Create campaign_members table for dual-role membership.
-- Links users to campaigns with a specific role (dm or player).
-- One user per campaign (UNIQUE constraint), with status tracking.

-- ============================================================
-- TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('dm', 'player')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
  UNIQUE(campaign_id, user_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_campaign_members_user ON campaign_members(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign ON campaign_members(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_role ON campaign_members(campaign_id, role);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;

-- Members can view other members of the same campaign
-- Uses SECURITY DEFINER helper to avoid infinite recursion (see migration 032)
CREATE POLICY campaign_members_select ON campaign_members
  FOR SELECT USING (public.is_campaign_member(campaign_id));

-- DM (campaign owner) can manage all members in their campaigns
CREATE POLICY campaign_members_dm_all ON campaign_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_members.campaign_id
      AND campaigns.owner_id = auth.uid()
    )
  );

-- Users can leave a campaign (delete their own membership)
CREATE POLICY campaign_members_user_delete ON campaign_members
  FOR DELETE USING (user_id = auth.uid());

-- Users can read their own membership (e.g. to check role)
CREATE POLICY campaign_members_own_select ON campaign_members
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- TRIGGER: Auto-add DM as member when campaign is created
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_campaign()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO campaign_members (campaign_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'dm', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists (idempotent)
DROP TRIGGER IF EXISTS on_campaign_created ON campaigns;

CREATE TRIGGER on_campaign_created
  AFTER INSERT ON campaigns
  FOR EACH ROW EXECUTE FUNCTION handle_new_campaign();
