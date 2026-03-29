-- 032_campaign_membership_helpers.sql
-- Story A.0: SECURITY DEFINER helper functions for campaign membership checks.
-- These bypass RLS to avoid infinite recursion when campaign_members policies
-- reference campaign_members itself (same pattern as is_admin() in migration 009).

-- Check if the current user is an active member of a campaign
CREATE OR REPLACE FUNCTION public.is_campaign_member(p_campaign_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_members
    WHERE campaign_id = p_campaign_id
    AND user_id = auth.uid()
    AND status = 'active'
  );
$$;

-- Check if the current user is an active member of the campaign that owns a session
CREATE OR REPLACE FUNCTION public.is_session_campaign_member(p_session_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.campaign_members cm ON cm.campaign_id = s.campaign_id
    WHERE s.id = p_session_id
    AND cm.user_id = auth.uid()
    AND cm.status = 'active'
  );
$$;

-- Check if the current user is an active member of the campaign that owns an encounter
-- (chains encounter → session → campaign → campaign_members)
CREATE OR REPLACE FUNCTION public.is_encounter_campaign_member(p_encounter_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.encounters e
    JOIN public.sessions s ON s.id = e.session_id
    JOIN public.campaign_members cm ON cm.campaign_id = s.campaign_id
    WHERE e.id = p_encounter_id
    AND cm.user_id = auth.uid()
    AND cm.status = 'active'
  );
$$;
