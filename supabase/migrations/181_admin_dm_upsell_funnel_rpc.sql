-- 181_admin_dm_upsell_funnel_rpc.sql
-- Epic 04 Sprint 2 Story 04-I — admin DM-upsell funnel RPC.
--
-- Why a dedicated RPC
-- ───────────────────
-- The existing `admin_event_funnel(since)` filters to a hard-coded
-- allow-list of event names (auth:signup_start, combat:started, etc.);
-- adding the ~13 `dm_upsell:*` events there would muddy two different
-- funnels (top-of-funnel acquisition vs. DM upsell onboarding). A
-- separate RPC keeps both dashboards focused and lets us extend the
-- dm_upsell surface without disturbing retention-team queries.
--
-- Shape: returns (event_name, event_count, unique_users) for every
-- event whose name starts with `dm_upsell:` in the window, sorted by
-- the canonical funnel order (declared in the function body) so the
-- dashboard renders the stages top-down without the client having to
-- resort. Unknown events (e.g. new ones shipped after this migration)
-- append to the end in alphabetical order.
--
-- Security
-- ────────
-- SECURITY DEFINER + `SET search_path` hardened (same pattern as
-- 170/174/176/178). REVOKE FROM PUBLIC + GRANT TO service_role only —
-- the admin route already gates on `users.is_admin` and fetches with
-- the service-role client, so `authenticated` never calls this RPC
-- directly and shouldn't be able to.

CREATE OR REPLACE FUNCTION admin_dm_upsell_funnel(since TIMESTAMPTZ)
RETURNS TABLE (
  event_name   TEXT,
  event_count  INTEGER,
  unique_users INTEGER,
  funnel_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH ordering AS (
    -- Canonical funnel order, matches the product funnel shape
    -- documented in Epic 04 §Área 6. Events not in this list get
    -- `NULL` order → sorted to the end alphabetically.
    SELECT * FROM (VALUES
      ('dm_upsell:cta_shown',                     1),
      ('dm_upsell:cta_clicked',                   2),
      ('dm_upsell:cta_dismissed',                 3),
      ('dm_upsell:wizard_started',                4),
      ('dm_upsell:wizard_failed',                 5),
      ('dm_upsell:role_upgraded_to_dm',           6),
      ('dm_upsell:first_campaign_created',        7),
      ('dm_upsell:tour_start_clicked',            8),
      ('dm_upsell:tour_start_skipped',            9),
      ('dm_upsell:tour_completed',               10),
      ('dm_upsell:tour_skipped',                 11),
      ('dm_upsell:past_companions_loaded',       12),
      ('dm_upsell:past_companion_link_copied',   13)
    ) AS t(name, ord)
  ),
  rollup AS (
    SELECT
      ae.event_name                                AS name,
      COUNT(*)::INTEGER                            AS cnt,
      COUNT(DISTINCT ae.user_id)::INTEGER          AS uniq
    FROM analytics_events ae
    WHERE ae.event_name LIKE 'dm_upsell:%'
      AND ae.created_at >= since
    GROUP BY ae.event_name
  )
  SELECT
    r.name                                  AS event_name,
    r.cnt                                   AS event_count,
    r.uniq                                  AS unique_users,
    COALESCE(o.ord, 999)                    AS funnel_order
  FROM rollup r
  LEFT JOIN ordering o ON o.name = r.name
  ORDER BY
    COALESCE(o.ord, 999) ASC,
    r.name ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_dm_upsell_funnel(TIMESTAMPTZ) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION admin_dm_upsell_funnel(TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION admin_dm_upsell_funnel(TIMESTAMPTZ) IS
  'Epic 04 Sprint 2 Story 04-I: admin funnel for dm_upsell:* events. '
  'Returns (event_name, event_count, unique_users, funnel_order) '
  'sorted by canonical stage order. SECURITY DEFINER; service_role only.';

-- Backout:
--   DROP FUNCTION IF EXISTS admin_dm_upsell_funnel(TIMESTAMPTZ);
