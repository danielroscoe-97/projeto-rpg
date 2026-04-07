-- Security fix: Remove overly permissive campaign_invites_read_pending policy.
-- Previously, ANY user (including anon) could list ALL pending invites,
-- exposing email addresses and campaign details.
--
-- After this migration, invite access is restricted to:
-- 1. DM (campaign owner) via campaign_invites_dm_all
-- 2. Recipient via campaign_invites_recipient_select (auth.email() match)
-- 3. Server-side service client for public invite page lookup (bypasses RLS)

DROP POLICY IF EXISTS campaign_invites_read_pending ON campaign_invites;
