-- 035_update_rls_for_members.sql
-- Story A.3: Add new RLS policies so campaign members can read campaign data.
-- These are ADDITIVE — existing owner/admin/player-token policies are NOT removed.
-- All policies use the SECURITY DEFINER helpers from migration 032.

-- ============================================================
-- CAMPAIGNS — members can read campaigns they belong to
-- ============================================================
CREATE POLICY campaigns_member_select ON campaigns
  FOR SELECT USING (public.is_campaign_member(id));

-- ============================================================
-- PLAYER CHARACTERS — members can read all PCs in their campaign
-- (needed for initiative board, companion list, etc.)
-- ============================================================
CREATE POLICY player_characters_member_select ON player_characters
  FOR SELECT USING (public.is_campaign_member(campaign_id));

-- ============================================================
-- SESSIONS — members can read sessions in their campaign
-- ============================================================
CREATE POLICY sessions_member_select ON sessions
  FOR SELECT USING (public.is_session_campaign_member(id));

-- ============================================================
-- ENCOUNTERS — members can read encounters in their campaign sessions
-- ============================================================
CREATE POLICY encounters_member_select ON encounters
  FOR SELECT USING (public.is_session_campaign_member(session_id));

-- ============================================================
-- COMBATANTS — members can read combatants in their campaign encounters
-- NOTE: Application layer MUST filter columns for player views
-- (never expose dm_notes, spell_save_dc, monster_id to players)
-- ============================================================
CREATE POLICY combatants_member_select ON combatants
  FOR SELECT USING (public.is_encounter_campaign_member(encounter_id));
