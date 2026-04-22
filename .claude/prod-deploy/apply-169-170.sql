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
-- 170_clone_campaign_from_template.sql
-- Epic 04 (Player-as-DM Upsell), Story 04-C — clone RPC.
--
-- Creates:
--   * RPC clone_campaign_from_template(p_template_id, p_new_dm_user_id) RETURNS JSON
--
-- Decisions:
--   D7  — SRD enforcement; RPC re-validates against srd_monster_slugs as
--         defense-in-depth (template trigger on 167 already guards writes).
--   D11 — F1 choice (b): keep explicit p_new_dm_user_id + assert auth.uid()
--         equals it at the top.
--   D12 — F-BONUS: copy template monsters_payload → encounters.creatures_snapshot
--         so the DM sees pre-populated creatures when they open the first
--         encounter after clone (both columns are JSONB).
--   D13 — F5: sessions.is_active defaults to true (see 002_session_tables.sql:14),
--         so the clone MUST set is_active = false explicitly. Otherwise the
--         freshly-cloned campaign shows as "live" in the dashboard.
--   F9  — Accumulate ALL missing-slug failures in a single pass; return a
--         structured { ok: false, missing_monsters: [...] } envelope so the
--         UI can show every offending encounter at once (not return-on-first).
--   F11 — REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated.
--   F30 — `create_campaign_with_settings` already had search_path locked in
--         migration 151; this chained SECURITY DEFINER call is safe.
--
-- Shape contract (see tests/upsell/clone-template.test.ts):
--   Success:      { ok: true,  campaign_id, join_code, session_id }
--   Missing SRD:  { ok: false, missing_monsters: [{encounter_id, missing_slugs: [...]}, ...] }
--   Not found:    RAISE with SQLSTATE P0002
--   Forbidden:    RAISE with SQLSTATE 42501
--
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION clone_campaign_from_template(
  p_template_id     UUID,
  p_new_dm_user_id  UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_template        RECORD;
  v_rpc_result      JSON;
  v_new_campaign_id UUID;
  v_join_code       TEXT;
  v_new_session_id  UUID;
  v_te              RECORD;
  v_slug            TEXT;
  v_missing_slugs   TEXT[];
  v_failures        JSONB := '[]'::jsonb;
BEGIN
  -- F1 — SECURITY DEFINER bypass prevention. Reject anon callers and any
  -- attempt to clone on behalf of another user id.
  IF auth.uid() IS NULL OR auth.uid() <> p_new_dm_user_id THEN
    RAISE EXCEPTION 'forbidden: cannot clone on behalf of another user'
      USING ERRCODE = '42501';
  END IF;

  -- Look up template, public only. Private/unpublished templates behave
  -- exactly like non-existent ones from the caller's perspective.
  SELECT id, name, description, game_system, target_party_level
    INTO v_template
    FROM campaign_templates
    WHERE id = p_template_id AND is_public = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'template not found or not public'
      USING ERRCODE = 'P0002';
  END IF;

  -- F9 — Accumulate ALL failing encounters in one pass. Defence-in-depth
  -- even though trg_validate_template_monsters_srd (167) already guards
  -- template writes — whitelist drift over time could invalidate
  -- historical template rows.
  FOR v_te IN
    SELECT id, monsters_payload
      FROM campaign_template_encounters
      WHERE template_id = p_template_id
  LOOP
    v_missing_slugs := ARRAY[]::TEXT[];
    IF v_te.monsters_payload IS NOT NULL
       AND jsonb_typeof(v_te.monsters_payload) = 'array'
    THEN
      FOR v_slug IN
        SELECT jsonb_array_elements(v_te.monsters_payload)->>'slug'
      LOOP
        IF v_slug IS NULL OR v_slug = '' THEN CONTINUE; END IF;
        IF NOT EXISTS (
          SELECT 1 FROM srd_monster_slugs WHERE slug = v_slug
        ) THEN
          v_missing_slugs := array_append(v_missing_slugs, v_slug);
        END IF;
      END LOOP;
    END IF;

    IF array_length(v_missing_slugs, 1) > 0 THEN
      v_failures := v_failures || jsonb_build_object(
        'encounter_id', v_te.id,
        'missing_slugs', to_jsonb(v_missing_slugs)
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(v_failures) > 0 THEN
    RETURN json_build_object(
      'ok', false,
      'missing_monsters', v_failures
    );
  END IF;

  -- Campaign creation delegated to the existing atomic RPC (122). That
  -- function handles campaigns + campaign_settings + DM membership
  -- trigger. Suffix " (cópia)" matches the product-copy decision in Area 4.
  v_rpc_result := create_campaign_with_settings(
    p_new_dm_user_id,
    v_template.name || ' (cópia)',
    v_template.description,
    v_template.game_system,
    v_template.target_party_level,
    NULL,    -- p_theme
    false    -- p_is_oneshot
  );

  v_new_campaign_id := (v_rpc_result->>'campaign_id')::UUID;
  v_join_code       := v_rpc_result->>'join_code';

  -- F5 — sessions.is_active DEFAULT is TRUE (002_session_tables.sql:14).
  -- Must be explicit here or the clone shows as "live" in the dashboard.
  INSERT INTO sessions (campaign_id, owner_id, name, is_active)
  VALUES (
    v_new_campaign_id,
    p_new_dm_user_id,
    v_template.name || ' — Sessão 1',
    false
  )
  RETURNING id INTO v_new_session_id;

  -- F-BONUS / D12 — copy monsters_payload → creatures_snapshot. Both
  -- columns are JSONB (encounters.creatures_snapshot added in migration
  -- 092). encounters.is_active default is false (migration 002:29); set
  -- explicitly for clarity / resistance to future default changes.
  -- F21 — 0-encounter templates: this INSERT ... SELECT is a no-op if
  -- no rows match, returns { ok: true, ..., session_id } with zero
  -- encounters attached.
  INSERT INTO encounters (session_id, name, dm_notes, creatures_snapshot, is_active)
  SELECT
    v_new_session_id,
    te.name,
    COALESCE(te.description, '') || E'\n\n' || COALESCE(te.narrative_prompt, ''),
    te.monsters_payload,
    false
  FROM campaign_template_encounters te
  WHERE te.template_id = p_template_id
  ORDER BY te.sort_order;

  RETURN json_build_object(
    'ok', true,
    'campaign_id', v_new_campaign_id,
    'join_code', v_join_code,
    'session_id', v_new_session_id
  );
END;
$$;

-- F11 — defense in depth. REVOKE first (in case prior grants exist from a
-- previous CREATE OR REPLACE cycle), then GRANT only to authenticated.
REVOKE EXECUTE ON FUNCTION clone_campaign_from_template(UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION clone_campaign_from_template(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION clone_campaign_from_template(UUID, UUID) IS
  'Epic 04 Story 04-C: clones a campaign_templates row into a freshly-owned '
  'campaign for the authenticated user (F1). Validates all encounters against '
  'srd_monster_slugs and returns accumulated failures (F9) before any writes. '
  'Creates a session with is_active=false (F5) and populates encounters with '
  'creatures_snapshot from template monsters_payload (F-BONUS / D12). '
  'SECURITY DEFINER to read srd_monster_slugs under caller RLS; search_path '
  'pinned; EXECUTE revoked from PUBLIC, granted to authenticated (F11).';

-- Backout:
--   DROP FUNCTION IF EXISTS clone_campaign_from_template(UUID, UUID);
