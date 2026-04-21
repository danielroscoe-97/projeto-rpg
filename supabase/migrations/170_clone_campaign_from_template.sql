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
