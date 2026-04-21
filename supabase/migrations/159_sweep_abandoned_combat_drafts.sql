-- 159_sweep_abandoned_combat_drafts.sql
-- Epic 12, Story 12.4 — sweep sessions that never graduated into a real combat.
--
-- Context: Story 12.2 started creating a `sessions` row as soon as the DM enters
-- the combat setup screen (eager draft persist). If the DM abandons the setup
-- (closes the tab, navigates away, never starts combat), that session row lives
-- forever with no encounter attached — polluting dashboards and stats.
--
-- A "draft" here is a session that:
--   - has NO encounters attached (user never clicked Start Combat), AND
--   - was created more than 72 hours ago (generous grace window).
--
-- AC4 — the function writes an audit entry into `error_logs` (level=info) with
-- the count and the DM breakdown, so operators can trace runs via the existing
-- admin dashboard instead of building a dedicated audit table.
--
-- The function is idempotent and safe to invoke manually or via pg_cron.
-- ON DELETE CASCADE on encounters/combatants takes care of descendants if any
-- half-created state ever gets into an edge branch.

CREATE OR REPLACE FUNCTION public.sweep_abandoned_combat_drafts(
  older_than interval DEFAULT interval '72 hours'
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
  owner_breakdown jsonb;
BEGIN
  -- Primary signal is the explicit `is_draft` flag (migration 160). We also
  -- keep the NOT EXISTS check as defense in depth: if future code ever skips
  -- the flip-to-false step, the sweeper still won't delete a session that
  -- has encounters attached.
  WITH deleted AS (
    DELETE FROM sessions s
    WHERE s.is_draft = true
      AND s.created_at < now() - older_than
      AND NOT EXISTS (
        SELECT 1 FROM encounters e WHERE e.session_id = s.id
      )
    RETURNING s.id, s.owner_id, s.campaign_id, s.created_at
  ), agg AS (
    SELECT count(*)::int AS total,
           jsonb_object_agg(COALESCE(owner_id::text, 'unknown'), cnt) AS by_owner
    FROM (
      SELECT owner_id, count(*) AS cnt FROM deleted GROUP BY owner_id
    ) sub
  )
  SELECT total, by_owner INTO deleted_count, owner_breakdown FROM agg;

  -- AC4 — operational audit trail. Only log when we actually deleted rows so
  -- the error_logs table isn't spammed with daily no-op entries.
  IF COALESCE(deleted_count, 0) > 0 THEN
    INSERT INTO public.error_logs (level, message, component, action, category, metadata)
    VALUES (
      'info',
      format('Swept %s abandoned combat draft session(s) (older_than=%s)', deleted_count, older_than),
      'sweep_abandoned_combat_drafts',
      'sweep',
      'housekeeping',
      jsonb_build_object(
        'deleted_count', deleted_count,
        'by_owner', COALESCE(owner_breakdown, '{}'::jsonb),
        'older_than', older_than::text
      )
    );
  END IF;

  RETURN COALESCE(deleted_count, 0);
END;
$$;

COMMENT ON FUNCTION public.sweep_abandoned_combat_drafts(interval) IS
  'Epic 12 Story 12.4 — deletes sessions older than `older_than` that never got an encounter. Writes an info-level audit row to error_logs when rows are deleted. Returns number of rows deleted.';

-- Lock down from public; only service_role (and pg_cron running as postgres)
-- should invoke this.
REVOKE ALL ON FUNCTION public.sweep_abandoned_combat_drafts(interval) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sweep_abandoned_combat_drafts(interval) TO service_role;

-- To schedule via pg_cron (enable the extension in the Supabase dashboard first),
-- run ONCE manually in the SQL editor:
--   SELECT cron.schedule(
--     'sweep-abandoned-combat-drafts',
--     '15 4 * * *', -- every day at 04:15 UTC
--     $$SELECT public.sweep_abandoned_combat_drafts();$$
--   );
