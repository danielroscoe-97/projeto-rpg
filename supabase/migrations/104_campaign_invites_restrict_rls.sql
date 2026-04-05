-- Security fix: Replace overly permissive USING(true) policy on campaign_invites.
-- The old policy allowed ANY user (including anon) to read ALL invites.
-- New policy restricts public reads to pending, non-expired invites only.
-- DM and recipient access is already covered by separate policies.

DROP POLICY IF EXISTS campaign_invites_read_by_token ON campaign_invites;

CREATE POLICY campaign_invites_read_pending ON campaign_invites
  FOR SELECT
  USING (status = 'pending' AND (expires_at IS NULL OR expires_at > now()));
