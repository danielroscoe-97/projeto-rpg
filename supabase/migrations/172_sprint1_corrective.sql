-- 172_sprint1_corrective.sql
-- Epic 04 Sprint 1 — post-adversarial-review fixes (no new surface, only
-- corrections to functions shipped in 169 and 170).
--
-- Reviewers surfaced two behavioural issues that both manifest only at
-- staging-integration time — neither Jest nor the shipped pgTap suite
-- caught them. We fix both via CREATE OR REPLACE rather than editing
-- 169/170 in place so the git history keeps a clean "what changed and why"
-- trail on staging rollout.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- H6 — clone_campaign_from_template does not preserve encounter ordering
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Migration 170 used `INSERT INTO encounters (…) SELECT … ORDER BY
-- te.sort_order`. Per the SQL standard (and the Postgres manual), ORDER BY
-- inside an INSERT … SELECT is ADVISORY — the planner may reorder rows
-- for parallelism or simply on a whim. `encounters` has no `sort_order`
-- column of its own (migration 002 schema), so after the clone the DM
-- sees encounters in whatever order Postgres happened to insert them,
-- not in the template's authored order.
--
-- Fix: replace the bulk INSERT..SELECT with an ordered PL/pgSQL cursor
-- loop. Each iteration is its own INSERT statement, so the insertion
-- timestamps and PK generation happen strictly in template sort_order.
-- Any downstream ordering that keys off `encounters.created_at` (or PK)
-- now matches template intent.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- M5 — get_past_companions DISTINCT ON tie is non-deterministic
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Migration 169 used `DISTINCT ON (companion_user_id) … ORDER BY
-- companion_user_id, session_updated_at DESC`. When two shared sessions
-- with the same companion have IDENTICAL `session_updated_at` (realistic
-- when two encounters close in the same transaction / same millisecond),
-- the DISTINCT ON pick is not stable — two runs of the same query can
-- return different `last_campaign_name` values for that companion.
--
-- Fix: add `campaign_id ASC` as a deterministic tiebreaker to both the
-- DISTINCT ON and the outer ORDER BY clauses in the CTE. Campaign UUIDs
-- are stable, so the same identical-timestamp pair always resolves to
-- the same campaign on repeated calls. This does NOT change the semantics
-- in the general (non-tied) case because `session_updated_at DESC` still
-- discriminates whenever the timestamps differ.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. clone_campaign_from_template — ordered-insert fix (H6)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION clone_campaign_from_template(
  p_template_id      UUID,
  p_new_dm_user_id   UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_template         RECORD;
  v_rpc_result       JSON;
  v_new_campaign_id  UUID;
  v_join_code        TEXT;
  v_new_session_id   UUID;
  v_te               RECORD;
  v_slug             TEXT;
  v_missing          TEXT[];
  v_failures         JSONB := '[]'::jsonb;
BEGIN
  -- F1 — authoritative auth check.
  IF auth.uid() IS NULL OR auth.uid() <> p_new_dm_user_id THEN
    RAISE EXCEPTION 'forbidden: cannot clone on behalf of another user'
      USING ERRCODE = '42501';
  END IF;

  -- Template lookup (public only).
  SELECT * INTO v_template
  FROM campaign_templates
  WHERE id = p_template_id AND is_public = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'template not found or not public'
      USING ERRCODE = 'P0002';
  END IF;

  -- F9 — accumulate every failing encounter before returning.
  FOR v_te IN
    SELECT id, monsters_payload
    FROM campaign_template_encounters
    WHERE template_id = p_template_id
  LOOP
    v_missing := ARRAY[]::TEXT[];
    IF v_te.monsters_payload IS NOT NULL
       AND jsonb_typeof(v_te.monsters_payload) = 'array' THEN
      FOR v_slug IN
        SELECT jsonb_array_elements(v_te.monsters_payload)->>'slug'
      LOOP
        IF v_slug IS NULL OR v_slug = '' THEN
          CONTINUE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM srd_monster_slugs WHERE slug = v_slug
        ) THEN
          v_missing := array_append(v_missing, v_slug);
        END IF;
      END LOOP;
    END IF;

    IF array_length(v_missing, 1) > 0 THEN
      v_failures := v_failures || jsonb_build_object(
        'encounter_id', v_te.id,
        'missing_slugs', to_jsonb(v_missing)
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(v_failures) > 0 THEN
    RETURN json_build_object(
      'ok', false,
      'missing_monsters', v_failures
    );
  END IF;

  -- Campaign creation delegated to the existing atomic RPC (122).
  v_rpc_result := create_campaign_with_settings(
    p_new_dm_user_id,
    v_template.name || ' (cópia)',
    v_template.description,
    v_template.game_system,
    v_template.target_party_level,
    NULL,
    false
  );

  v_new_campaign_id := (v_rpc_result->>'campaign_id')::UUID;
  v_join_code       := v_rpc_result->>'join_code';

  -- F5 — sessions.is_active DEFAULT is TRUE, make it explicit.
  INSERT INTO sessions (campaign_id, owner_id, name, is_active)
  VALUES (
    v_new_campaign_id,
    p_new_dm_user_id,
    v_template.name || ' — Sessão 1',
    false
  )
  RETURNING id INTO v_new_session_id;

  -- H6 — ordered INSERT loop replaces the prior bulk INSERT..SELECT.
  -- The loop variable reads rows in sort_order, so each INSERT statement
  -- fires strictly in template order — preserving narrative sequence in
  -- encounters.created_at / PK ordering. F-BONUS / D12 still applies:
  -- creatures_snapshot is copied from monsters_payload (both JSONB).
  FOR v_te IN
    SELECT name, description, narrative_prompt, monsters_payload
    FROM campaign_template_encounters
    WHERE template_id = p_template_id
    ORDER BY sort_order ASC, id ASC
  LOOP
    INSERT INTO encounters (
      session_id, name, dm_notes, creatures_snapshot, is_active
    )
    VALUES (
      v_new_session_id,
      v_te.name,
      COALESCE(v_te.description, '')
        || E'\n\n'
        || COALESCE(v_te.narrative_prompt, ''),
      v_te.monsters_payload,
      false
    );
  END LOOP;

  RETURN json_build_object(
    'ok', true,
    'campaign_id', v_new_campaign_id,
    'join_code', v_join_code,
    'session_id', v_new_session_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION clone_campaign_from_template(UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION clone_campaign_from_template(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION clone_campaign_from_template(UUID, UUID) IS
  'Epic 04 Story 04-C (patched in 172/H6): clones a campaign_templates row '
  'into a freshly-owned campaign for the authenticated user. Encounter '
  'insertion uses an ordered PL/pgSQL loop to preserve template sort_order '
  'in the resulting encounters.created_at sequence (the bulk INSERT..SELECT '
  'variant did not, because ORDER BY in INSERT..SELECT is advisory only).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. get_past_companions — deterministic tiebreaker (M5)
-- ─────────────────────────────────────────────────────────────────────────────

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
    -- M5 — tiebreaker on campaign_id so identical session_updated_at
    -- values resolve deterministically. Without it, DISTINCT ON can
    -- return different campaigns across runs for the same data.
    SELECT DISTINCT ON (companion_user_id)
      companion_user_id,
      campaign_id
    FROM shared_encounters
    ORDER BY companion_user_id, session_updated_at DESC, campaign_id ASC
  )
  SELECT
    se.companion_user_id,
    COALESCE(u.display_name, '(?)') AS companion_display_name,
    u.avatar_url                    AS companion_avatar_url,
    COUNT(DISTINCT se.session_id)::INTEGER AS sessions_together,
    c.name                          AS last_campaign_name
  FROM shared_encounters se
  LEFT JOIN users u              ON u.id = se.companion_user_id
  LEFT JOIN last_per_companion lpc
                                 ON lpc.companion_user_id = se.companion_user_id
  LEFT JOIN campaigns c          ON c.id = lpc.campaign_id
  WHERE (u.id IS NULL OR COALESCE(u.share_past_companions, true) = true)
  GROUP BY se.companion_user_id, u.id, u.display_name, u.avatar_url, c.name
  ORDER BY sessions_together DESC, companion_display_name ASC
  LIMIT v_effective_limit OFFSET v_effective_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_past_companions(INTEGER, INTEGER) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_past_companions(INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_past_companions(INTEGER, INTEGER) IS
  'Epic 04 Story 04-D (patched in 172/M5): returns users who share at least '
  'one session with auth.uid(). DISTINCT ON for last_campaign_name now '
  'tiebreaks on campaign_id ASC so identical session_updated_at values '
  'resolve deterministically across runs.';

-- Backout: re-apply 170 and 169 (the prior definitions are intact in their
-- respective source files; CREATE OR REPLACE in 172 simply swaps the body).
