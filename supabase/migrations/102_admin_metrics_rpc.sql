-- ============================================================
-- Migration 102: Server-side RPC for admin metrics
-- Replaces expensive client-side subqueries with efficient SQL
-- ============================================================

-- Day-1 activation: users who created a session within 24h of signup
CREATE OR REPLACE FUNCTION admin_day1_activation()
RETURNS TABLE(total_eligible bigint, activated bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_eligible,
    COUNT(CASE WHEN EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.owner_id = u.id
        AND s.created_at <= u.created_at + interval '1 day'
    ) THEN 1 END)::bigint AS activated
  FROM users u
  WHERE u.created_at < now() - interval '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Week-2 retention: users who had a session between day 7 and day 14
CREATE OR REPLACE FUNCTION admin_week2_retention()
RETURNS TABLE(total_eligible bigint, retained bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_eligible,
    COUNT(CASE WHEN EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.owner_id = u.id
        AND s.created_at >= u.created_at + interval '7 days'
        AND s.created_at <= u.created_at + interval '14 days'
    ) THEN 1 END)::bigint AS retained
  FROM users u
  WHERE u.created_at < now() - interval '14 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Average players per DM: count unique anon_user_ids per session owner
CREATE OR REPLACE FUNCTION admin_avg_players_per_dm()
RETURNS TABLE(dm_count bigint, avg_players numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT s.owner_id)::bigint AS dm_count,
    COALESCE(
      ROUND(COUNT(DISTINCT st.anon_user_id)::numeric / NULLIF(COUNT(DISTINCT s.owner_id), 0), 1),
      0
    ) AS avg_players
  FROM session_tokens st
  JOIN sessions s ON s.id = st.session_id
  WHERE st.anon_user_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
