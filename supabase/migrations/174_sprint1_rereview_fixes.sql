-- 174_sprint1_rereview_fixes.sql
-- Epic 04 Sprint 1 — adversarial RE-review (post-173) follow-ups.
--
-- Two concrete defects surfaced that 172/173 didn't actually fix:
--
-- ─────────────────────────────────────────────────────────────────────────────
-- H6 real fix — clone_campaign_from_template encounter ordering was a no-op
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Migration 172 wrapped the encounter INSERTs in a PL/pgSQL cursor loop
-- and claimed that "each INSERT statement fires strictly in template
-- order, preserving template sort_order in encounters.created_at".
-- False.
--
-- Postgres `now()` is `transaction_timestamp()` — it is CONSTANT for the
-- entire surrounding transaction. Every row inserted by the loop gets
-- the IDENTICAL `created_at`. Combined with `encounters.id = gen_random_uuid()`
-- (random), any downstream query that does `ORDER BY created_at` (or PK)
-- sees an arbitrary tiebreak. The ordering claim is advisory-only,
-- exactly the bug H6 was supposed to fix.
--
-- This migration adds an explicit `encounters.sort_order INT` column
-- (DEFAULT 0, NOT NULL) and republishes clone_campaign_from_template to
-- populate it from the template's sort_order. Downstream UI that cares
-- about encounter order should `ORDER BY sort_order, created_at` — the
-- tie breaker on `created_at` is meaningful for encounters NOT created
-- by a clone (they keep sort_order = 0 but distinguishable timestamps).
--
-- Existing rows default to 0. No consumer regressions: no code currently
-- queries `encounters.sort_order` so adding the column is additive.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- audit_template_srd_drift — uncallable without a GRANT (E)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Migration 173 declared the function SECURITY DEFINER, REVOKEd EXECUTE
-- from PUBLIC, and left NO explicit GRANT. Comment said "admin-only, call
-- from a service-role cron job", but service_role still needs explicit
-- EXECUTE on the function (service_role bypasses RLS but NOT function
-- EXECUTE grants). This migration grants EXECUTE to service_role so the
-- audit can actually run.
--
-- The function stays unreachable from authenticated / anon roles.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. encounters.sort_order column (H6)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN encounters.sort_order IS
  'Epic 04 Sprint 1 H6 (migration 174): integer ordering hint. Populated by '
  'clone_campaign_from_template from the template''s sort_order; defaults to 0 '
  'for encounters created through other flows. UI queries that need template '
  'order should ORDER BY sort_order, created_at.';

-- No index on sort_order alone — too low-cardinality per session to matter.
-- Queries within a single session sort the ~5-10 row set in memory.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. clone_campaign_from_template — populate encounters.sort_order
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

  -- F5 — sessions.is_active DEFAULT TRUE, explicit here.
  INSERT INTO sessions (campaign_id, owner_id, name, is_active)
  VALUES (
    v_new_campaign_id,
    p_new_dm_user_id,
    v_template.name || ' — Sessão 1',
    false
  )
  RETURNING id INTO v_new_session_id;

  -- H6 (real fix) — copy template's sort_order into encounters.sort_order
  -- so downstream ORDER BY has a reliable discriminator. The cursor loop
  -- still exists for F-BONUS (copy creatures_snapshot) and F5 explicit
  -- is_active, but narrative-order preservation now lives on a real
  -- column rather than relying on transaction-timestamp races.
  FOR v_te IN
    SELECT name, description, narrative_prompt, monsters_payload, sort_order
    FROM campaign_template_encounters
    WHERE template_id = p_template_id
    ORDER BY sort_order ASC, id ASC
  LOOP
    INSERT INTO encounters (
      session_id, name, dm_notes, creatures_snapshot, is_active, sort_order
    )
    VALUES (
      v_new_session_id,
      v_te.name,
      COALESCE(v_te.description, '')
        || E'\n\n'
        || COALESCE(v_te.narrative_prompt, ''),
      v_te.monsters_payload,
      false,
      v_te.sort_order
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
  'Epic 04 Story 04-C (patched in 174/H6-real): clones a template into a '
  'freshly-owned campaign, copying the template''s sort_order into the new '
  'encounters.sort_order column so narrative order is preserved via a real '
  'column rather than relying on transaction-timestamp ordering (which '
  'Postgres does not guarantee — now() is constant inside a transaction).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. audit_template_srd_drift — add missing service_role GRANT (E)
-- ─────────────────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION audit_template_srd_drift() TO service_role;

COMMENT ON FUNCTION audit_template_srd_drift() IS
  'Epic 04 Sprint 1 follow-up (migration 173, grants fixed in 174): reports '
  'campaign_template_encounters whose monsters_payload references slugs NO '
  'LONGER in srd_monster_slugs. EXECUTE granted to service_role so a Supabase '
  'admin client (or pg_cron job scheduled under service_role) can actually '
  'invoke it — prior REVOKE-without-GRANT shape made the function unreachable '
  'outside the postgres superuser context.';

-- Backout:
--   REVOKE EXECUTE ON FUNCTION audit_template_srd_drift() FROM service_role;
--   ALTER TABLE encounters DROP COLUMN IF EXISTS sort_order;
--   (Re-apply 172 to restore the broken clone loop, or just leave 174 as the latest.)
