-- 169_past_companions.sql (renumbered pre-commit; Dani took 160-164 in 842e5da1 campaign-workspace)
-- Epic 04 (Player-as-DM Upsell), Story 04-A, Área 5 (Viral loop primitives).
--
-- Exposes the "players I've shared sessions with" graph for the Área 5 UI
-- ("Convide quem jogou com você").
--
-- ─────────────────────────────────────────────────────────────────────────────
-- Design decisions (revised after Story 04-A code review)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Why SECURITY DEFINER function, NOT a plain view
--   Postgres views do not carry per-row RLS in all interactions (review v2
--   flagged leakage on grants). A SECURITY DEFINER function that captures
--   auth.uid() in its body is defensible: the function decides what it
--   returns based on the authenticated identity and the caller cannot
--   spoof that.
--
-- D8 — privacy opt-out
--   `users.share_past_companions` filter drops opted-out companions.
--   Column is NOT NULL DEFAULT true (migration 166) so COALESCE is
--   technically dead code; we keep the direct comparison for clarity.
--
-- F3 — last_campaign_name per companion
--   Earlier drafts used a correlated subquery inside SELECT, which
--   Postgres can plan poorly (review flagged O(N²)). The new shape
--   computes `last_per_companion` in a CTE via DISTINCT ON and joins it
--   back. Functionally identical, linear cost.
--
-- F11 — defense in depth
--   REVOKE from PUBLIC, GRANT to authenticated explicitly.
--
-- M9 — LEFT JOIN users with COALESCE fallback
--   A companion's player_character may reference an auth.users row that
--   has no matching public.users profile row (anon→auth upgrade window,
--   legacy accounts). INNER JOIN silently dropped them; LEFT JOIN with
--   a '(?)' fallback display_name keeps them visible so the inviter can
--   still pick them from the list.

CREATE OR REPLACE FUNCTION get_past_companions(
  p_limit  INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  companion_user_id       UUID,
  companion_display_name  TEXT,
  companion_avatar_url    TEXT,
  sessions_together       INTEGER,
  last_campaign_name      TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_effective_limit  INTEGER;
  v_effective_offset INTEGER;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Pagination clamp. Uses local variables so the clamped values don't
  -- shadow the caller's inputs if anyone logs them later.
  v_effective_limit := COALESCE(p_limit, 50);
  IF v_effective_limit < 1  THEN v_effective_limit := 50;  END IF;
  IF v_effective_limit > 200 THEN v_effective_limit := 200; END IF;
  v_effective_offset := COALESCE(p_offset, 0);
  IF v_effective_offset < 0 THEN v_effective_offset := 0; END IF;

  RETURN QUERY
  WITH my_sessions AS (
    -- Every session the caller participated in as a player.
    SELECT DISTINCT s.id AS session_id, s.campaign_id
    FROM sessions s
    JOIN encounters e         ON e.session_id = s.id
    JOIN combatants c         ON c.encounter_id = e.id
    JOIN player_characters pc ON pc.id = c.player_character_id
    WHERE pc.user_id = v_me
  ),
  shared_encounters AS (
    -- Sessions the caller shared with *other* users (exclude self).
    SELECT DISTINCT
      ms.session_id,
      ms.campaign_id,
      opc.user_id AS companion_user_id,
      s.updated_at AS session_updated_at
    FROM my_sessions ms
    JOIN sessions s            ON s.id = ms.session_id
    JOIN encounters e          ON e.session_id = ms.session_id
    JOIN combatants oc         ON oc.encounter_id = e.id
    JOIN player_characters opc ON opc.id = oc.player_character_id
    WHERE opc.user_id IS NOT NULL
      AND opc.user_id <> v_me
  ),
  -- F3: pick the most recently-touched shared session per companion
  -- exactly once. DISTINCT ON is O(N log N) with a proper sort.
  last_per_companion AS (
    SELECT DISTINCT ON (companion_user_id)
      companion_user_id,
      campaign_id
    FROM shared_encounters
    ORDER BY companion_user_id, session_updated_at DESC
  )
  SELECT
    se.companion_user_id,
    -- M9: LEFT JOIN means u.* can be NULL when a profile row is missing.
    COALESCE(u.display_name, '(?)') AS companion_display_name,
    u.avatar_url                    AS companion_avatar_url,
    COUNT(DISTINCT se.session_id)::INTEGER AS sessions_together,
    c.name                          AS last_campaign_name
  FROM shared_encounters se
  LEFT JOIN users u          ON u.id = se.companion_user_id
  LEFT JOIN last_per_companion lpc
                             ON lpc.companion_user_id = se.companion_user_id
  LEFT JOIN campaigns c      ON c.id = lpc.campaign_id
  -- D8: respect opt-out. Users with missing profile rows (u.id IS NULL) pass
  -- through since they have no preference recorded.
  WHERE (u.id IS NULL OR COALESCE(u.share_past_companions, true) = true)
  GROUP BY se.companion_user_id, u.id, u.display_name, u.avatar_url, c.name
  ORDER BY sessions_together DESC, companion_display_name ASC
  LIMIT v_effective_limit OFFSET v_effective_offset;
END;
$$;

COMMENT ON FUNCTION get_past_companions(INTEGER, INTEGER) IS
  'Epic 04 Story 04-D / Área 5: returns users who share at least one session with '
  'auth.uid(). Respects users.share_past_companions opt-out (D8). Self-referencing '
  'rows are filtered. Companions with missing public.users profiles still appear '
  'with a "(?)" display name (M9). Raises 42501 if called without an authenticated '
  'JWT.';

-- F11 — defense in depth
REVOKE EXECUTE ON FUNCTION get_past_companions(INTEGER, INTEGER) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_past_companions(INTEGER, INTEGER) TO authenticated;

-- Backout:
--   DROP FUNCTION IF EXISTS get_past_companions(INTEGER, INTEGER);

-- Smoke test (run post-apply in staging):
--
--   -- As user with at least one shared encounter:
--   set role authenticated;
--   set request.jwt.claim.sub to '<user-uuid>';
--   select * from get_past_companions();
--   -- Expect: rows per distinct companion, ordered by sessions_together desc
--
--   -- As unauthenticated PUBLIC:
--   reset role;
--   select * from get_past_companions();
--   -- Expect: permission denied for function get_past_companions
