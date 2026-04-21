-- 173_sprint1_followups.sql
-- Epic 04 Sprint 1 — deferred follow-ups from the adversarial review.
--
-- Two behavioural changes + one auditing helper. No new tables, no
-- destructive DDL; safe to re-apply.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- H3 — Close the `u.id IS NULL` privacy leak in get_past_companions
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Prior behaviour (169 → patched in 172): returned companions whose
-- public.users profile row did not exist, with display_name coalesced
-- to '(?)'. That was the M9 "visibility fallback" — keep the companion
-- in the list even if the profile row went missing.
--
-- The adversarial review surfaced a real privacy hole: if a user opts out
-- (share_past_companions = false) and LATER has their profile row
-- deleted (GDPR request, account cleanup), they would reappear in the
-- past-companions graph for every DM who played with them before the
-- deletion. The opt-out was stored on the now-missing row; the `u.id IS
-- NULL` branch bypasses it.
--
-- Trade-off: losing the M9 fallback means legacy accounts or
-- anon→auth upgrade windows where the public.users row hasn't been
-- created yet won't show in the list. Those are rare edge cases with
-- no privacy-regression path — strictly safer than the inverse.
--
-- This change requires the pgTap test 02 (M9 bonus case) to update its
-- expectation: profile-less companions now DON'T appear (matched by a
-- companion commit to the test file in the same PR).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- Source-drift audit helper
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Template encounters reference monsters by slug, validated at write
-- time against srd_monster_slugs. But that whitelist is not immutable —
-- the SRD canon can be trimmed, or a monster's source_type could be
-- flipped upstream. When that happens, EXISTING template rows become
-- retroactively invalid (still referenced in JSONB, no longer in the
-- whitelist). Users cloning such a template get a { ok: false,
-- missing_monsters: […] } response, which is the right contract, but
-- the admin never learns there's a template to patch.
--
-- audit_template_srd_drift() returns a report of every template whose
-- encounters reference slugs NOT currently in srd_monster_slugs. Invoke
-- manually or via pg_cron. Returns an empty set when clean.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. H3 — get_past_companions hardening
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
  -- H3: INNER JOIN (was LEFT JOIN). Companions whose public.users profile
  -- is missing are now EXCLUDED from the result — prevents the opt-out
  -- bypass when a user opts out and is later profile-deleted. Residual
  -- cost: legacy / anon-upgrade-window companions temporarily don't show
  -- (they'll reappear once their profile is created).
  JOIN users u               ON u.id = se.companion_user_id
  LEFT JOIN last_per_companion lpc
                             ON lpc.companion_user_id = se.companion_user_id
  LEFT JOIN campaigns c      ON c.id = lpc.campaign_id
  -- Opt-out now unambiguous: only profile-present companions reach here,
  -- and their share_past_companions is directly readable.
  WHERE COALESCE(u.share_past_companions, true) = true
  GROUP BY se.companion_user_id, u.display_name, u.avatar_url, c.name
  ORDER BY sessions_together DESC, u.display_name ASC NULLS LAST
  LIMIT v_effective_limit OFFSET v_effective_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_past_companions(INTEGER, INTEGER) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_past_companions(INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_past_companions(INTEGER, INTEGER) IS
  'Epic 04 Story 04-D (hardened in 173/H3): returns users who share at least '
  'one session with auth.uid(). Profile-less companions are now excluded (no '
  'M9 "(?)" fallback) — closes the opt-out bypass where a privacy-deleted '
  'profile would resurface the companion. DISTINCT ON for last_campaign_name '
  'tiebreaks on campaign_id ASC (M5).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. audit_template_srd_drift — manual / cron-invoked drift report
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_template_srd_drift()
RETURNS TABLE (
  template_id       UUID,
  template_name     TEXT,
  encounter_id      UUID,
  encounter_name    TEXT,
  missing_slugs     TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH exploded AS (
    SELECT
      t.id   AS template_id,
      t.name AS template_name,
      te.id  AS encounter_id,
      te.name AS encounter_name,
      jsonb_array_elements(te.monsters_payload)->>'slug' AS slug
    FROM campaign_templates t
    JOIN campaign_template_encounters te ON te.template_id = t.id
    WHERE te.monsters_payload IS NOT NULL
      AND jsonb_typeof(te.monsters_payload) = 'array'
  ),
  drift AS (
    SELECT
      e.template_id,
      e.template_name,
      e.encounter_id,
      e.encounter_name,
      e.slug
    FROM exploded e
    WHERE e.slug IS NOT NULL
      AND e.slug <> ''
      AND NOT EXISTS (
        SELECT 1 FROM srd_monster_slugs s WHERE s.slug = e.slug
      )
  )
  SELECT
    d.template_id,
    d.template_name,
    d.encounter_id,
    d.encounter_name,
    array_agg(DISTINCT d.slug) AS missing_slugs
  FROM drift d
  GROUP BY d.template_id, d.template_name, d.encounter_id, d.encounter_name
  ORDER BY d.template_name, d.encounter_name;
END;
$$;

COMMENT ON FUNCTION audit_template_srd_drift() IS
  'Epic 04 Sprint 1 follow-up: reports campaign_template_encounters whose '
  'monsters_payload references slugs NO LONGER in srd_monster_slugs. Manual '
  'invocation or via pg_cron. Empty result = no drift. Intended as the daily '
  'cron companion to the template validation trigger — the trigger prevents '
  'NEW rows from entering with non-SRD slugs, this audit catches EXISTING '
  'rows that became invalid when the whitelist tightened upstream.';

REVOKE EXECUTE ON FUNCTION audit_template_srd_drift() FROM PUBLIC;
-- Admin-only: no authenticated GRANT. Call from a service-role cron job.

-- Backout:
--   DROP FUNCTION IF EXISTS audit_template_srd_drift();
--   (get_past_companions can be rolled back by re-applying 172.)
