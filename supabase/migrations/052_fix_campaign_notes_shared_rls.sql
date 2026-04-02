-- 052_fix_campaign_notes_shared_rls.sql
-- Fix: campaign_notes_shared_read policy was defined in 042 but missing from production.
-- Idempotent: DROP IF EXISTS before CREATE.
--
-- Rule: active campaign members (role='player' OR 'dm') can SELECT notes where is_shared=true.
-- Anonymous players (/join via session_tokens) are excluded — Auth-only feature.

DROP POLICY IF EXISTS "campaign_notes_shared_read" ON campaign_notes;

CREATE POLICY "campaign_notes_shared_read" ON campaign_notes
  FOR SELECT USING (
    is_shared = true
    AND public.is_campaign_member(campaign_id)
  );
