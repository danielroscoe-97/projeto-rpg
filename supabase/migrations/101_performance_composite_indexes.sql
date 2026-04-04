-- ============================================================
-- Migration 101: Performance composite indexes
-- Fixes: Disk IO budget depletion on Supabase free tier
-- Root cause: RLS policies do multi-table JOINs without covering indexes
-- ============================================================

-- 1. session_tokens: composite for player access RLS check
-- Covers: EXISTS (SELECT 1 FROM session_tokens WHERE session_id=X AND anon_user_id=uid AND is_active=true)
-- This fires on EVERY player query to sessions, encounters, combatants
CREATE INDEX IF NOT EXISTS idx_session_tokens_session_anon_active
  ON session_tokens(session_id, anon_user_id)
  WHERE is_active = true;

-- 2. campaign_members: composite for active member checks
-- Covers: is_campaign_member() SECURITY DEFINER function used in 10+ RLS policies
CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign_user_active
  ON campaign_members(campaign_id, user_id)
  WHERE status = 'active';

-- 3. session_tokens: heartbeat stale detection (DM polls last_seen_at)
-- Covers: SELECT id, player_name, last_seen_at FROM session_tokens WHERE session_id=X AND is_active=true
CREATE INDEX IF NOT EXISTS idx_session_tokens_session_active_lastseen
  ON session_tokens(session_id, last_seen_at DESC)
  WHERE is_active = true;

-- 4. encounters: active encounter lookup (most frequent query in combat)
-- Covers: WHERE session_id=X AND is_active=true ORDER BY created_at DESC LIMIT 1
CREATE INDEX IF NOT EXISTS idx_encounters_session_active
  ON encounters(session_id, created_at DESC)
  WHERE is_active = true;

-- 5. sessions: owner lookup for broadcast auth check (60 req/min)
-- Covers: SELECT owner_id FROM sessions WHERE id=X
-- Primary key already covers eq(id), but this adds owner_id to avoid heap lookup
CREATE INDEX IF NOT EXISTS idx_sessions_id_owner
  ON sessions(id) INCLUDE (owner_id, dm_last_seen_at);

-- 6. combatants: optimized for broadcast/state API (most data-heavy query)
-- Covers: WHERE encounter_id=X ORDER BY initiative_order ASC
-- initiative_order already indexed, but adding encounter_id as leading column
CREATE INDEX IF NOT EXISTS idx_combatants_encounter_initiative
  ON combatants(encounter_id, initiative_order ASC);
