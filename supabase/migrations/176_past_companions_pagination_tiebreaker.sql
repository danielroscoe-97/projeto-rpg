-- 176_past_companions_pagination_tiebreaker.sql
-- Epic 04 Sprint 1 re-review — medium follow-up.
--
-- Issue: get_past_companions() (declared in 169, last rewritten in 173)
-- closes with:
--
--   ORDER BY sessions_together DESC, u.display_name ASC NULLS LAST
--
-- Two companions sharing the same sessions_together AND both having
-- NULL display_name (post-H3 INNER JOIN this is unlikely but still
-- possible — a public.users row can exist with display_name unset)
-- sort in non-deterministic order. Pagination anomaly: page 1 at
-- offset 0 limit 25 may show companion A at position 25; page 2 at
-- offset 20 limit 25 may show A again AND miss companion B entirely.
--
-- Fix: add `se.companion_user_id ASC` as the final stable tiebreaker.
-- UUID comparison is deterministic; companion_user_id is unique within
-- the result set (the GROUP BY makes it one row per companion).

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
  v_me                UUID := auth.uid();
  v_effective_limit   INTEGER;
  v_effective_offset  INTEGER;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  v_effective_limit := COALESCE(p_limit, 50);
  IF v_effective_limit < 1   THEN v_effective_limit := 50;  END IF;
  IF v_effective_limit > 200 THEN v_effective_limit := 200; END IF;
  v_effective_offset := COALESCE(p_offset, 0);
  IF v_effective_offset < 0  THEN v_effective_offset := 0;  END IF;

  RETURN QUERY
  WITH my_sessions AS (
    SELECT DISTINCT s.id AS session_id, s.campaign_id
    FROM sessions s
    JOIN encounters e         ON e.session_id = s.id
    JOIN combatants c         ON c.encounter_id = e.id
    JOIN player_characters pc ON pc.id = c.player_character_id
    WHERE pc.user_id = v_me
  ),
  shared_encounters AS (
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
  last_per_companion AS (
    SELECT DISTINCT ON (companion_user_id)
      companion_user_id,
      campaign_id
    FROM shared_encounters
    ORDER BY companion_user_id, session_updated_at DESC, campaign_id ASC
  )
  SELECT
    se.companion_user_id,
    u.display_name           AS companion_display_name,
    u.avatar_url             AS companion_avatar_url,
    COUNT(DISTINCT se.session_id)::INTEGER AS sessions_together,
    c.name                   AS last_campaign_name
  FROM shared_encounters se
  JOIN users u               ON u.id = se.companion_user_id
  LEFT JOIN last_per_companion lpc
                             ON lpc.companion_user_id = se.companion_user_id
  LEFT JOIN campaigns c      ON c.id = lpc.campaign_id
  WHERE COALESCE(u.share_past_companions, true) = true
  GROUP BY se.companion_user_id, u.display_name, u.avatar_url, c.name
  -- 176: final tiebreaker on companion_user_id makes pagination stable
  -- when display_name is NULL for multiple rows with the same
  -- sessions_together count.
  ORDER BY sessions_together DESC, u.display_name ASC NULLS LAST, se.companion_user_id ASC
  LIMIT v_effective_limit OFFSET v_effective_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_past_companions(INTEGER, INTEGER) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_past_companions(INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_past_companions(INTEGER, INTEGER) IS
  'Epic 04 Story 04-D (patched in 176): deterministic pagination tiebreaker on '
  'companion_user_id ASC. Otherwise identical to 173 body (INNER JOIN users + '
  'share_past_companions filter, DISTINCT ON per-companion last_campaign_name).';
