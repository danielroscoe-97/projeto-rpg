-- Admin analytics RPCs for expanded dashboard (F-47)

-- Event funnel: distinct users per key event (last N days)
CREATE OR REPLACE FUNCTION admin_event_funnel(since TIMESTAMPTZ)
RETURNS TABLE(event_name TEXT, unique_users BIGINT) AS $$
  SELECT
    e.event_name,
    COUNT(DISTINCT COALESCE(e.user_id::text, e.anonymous_id)) AS unique_users
  FROM analytics_events e
  WHERE e.created_at >= since
    AND e.event_name IN (
      'auth:signup_start', 'auth:login',
      'combat:started', 'combat:ended',
      'player:joined', 'oracle:search',
      'compendium:visited', 'preset:loaded'
    )
  GROUP BY e.event_name
  ORDER BY unique_users DESC;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Top N events by raw count (last N days)
CREATE OR REPLACE FUNCTION admin_top_events(since TIMESTAMPTZ, lim INT DEFAULT 15)
RETURNS TABLE(event_name TEXT, event_count BIGINT) AS $$
  SELECT
    e.event_name,
    COUNT(*) AS event_count
  FROM analytics_events e
  WHERE e.created_at >= since
  GROUP BY e.event_name
  ORDER BY event_count DESC
  LIMIT lim;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Guest conversion funnel (last N days)
CREATE OR REPLACE FUNCTION admin_guest_funnel(since TIMESTAMPTZ)
RETURNS TABLE(event_name TEXT, event_count BIGINT) AS $$
  SELECT
    e.event_name,
    COUNT(*) AS event_count
  FROM analytics_events e
  WHERE e.created_at >= since
    AND e.event_name IN (
      'guest:combat_started', 'guest:combat_ended',
      'guest:upsell_shown', 'guest:recap_save_signup',
      'guest:session_expired', 'guest:expired_cta_signup'
    )
  GROUP BY e.event_name
  ORDER BY event_count DESC;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Combat stats aggregated (last N days)
CREATE OR REPLACE FUNCTION admin_combat_stats(since TIMESTAMPTZ)
RETURNS TABLE(
  total_encounters BIGINT,
  avg_rounds NUMERIC,
  avg_duration_seconds NUMERIC,
  total_players_joined BIGINT
) AS $$
  SELECT
    (SELECT COUNT(*) FROM encounters WHERE created_at >= since) AS total_encounters,
    (SELECT ROUND(AVG(round_number), 1) FROM encounters WHERE created_at >= since AND round_number > 1) AS avg_rounds,
    (SELECT ROUND(AVG(duration_seconds), 0) FROM encounters WHERE created_at >= since AND duration_seconds > 0) AS avg_duration_seconds,
    (SELECT COUNT(*) FROM analytics_events WHERE event_name = 'player:joined' AND created_at >= since) AS total_players_joined;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
