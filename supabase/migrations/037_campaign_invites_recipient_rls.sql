-- 037_campaign_invites_recipient_rls.sql
-- Story A.8: Allow invite recipients to read their own invites by email.
-- Needed for B.4 (pending invites on dashboard) where the user fetches
-- invites addressed to their email. Uses auth.email() from Supabase Auth.

CREATE POLICY campaign_invites_recipient_select ON campaign_invites
  FOR SELECT USING (
    email = auth.email()
  );
