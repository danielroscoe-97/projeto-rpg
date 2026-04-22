-- 178_qa_backdate_session.sql
-- QA-only helper: backdate `sessions.updated_at` bypassing the
-- `trg_sessions_updated_at` BEFORE-UPDATE trigger that unconditionally
-- sets NEW.updated_at = now() on every UPDATE.
--
-- Context: Epic 12 Story 12.9 AC5 ships a stale-session confirmation modal
-- that fires when a session has been idle > 4h. Smoke-testing the positive
-- path in prod requires backdating an active session's `updated_at`. The
-- existing trigger makes that impossible via a plain UPDATE, so we need
-- this helper.
--
-- Security model:
--   - SECURITY DEFINER runs as the function owner (postgres role during
--     migration apply), which has the `REPLICATION` / `BYPASSTRIGGER`
--     equivalence via `session_replication_role = replica`.
--   - GRANTed to `service_role` only — anon/authenticated cannot call it.
--   - Owner-scoped: the caller must prove they own the session via
--     `auth.uid() = sessions.owner_id`, enforced inside the function.
--     Since service_role bypasses RLS, we include an explicit
--     `p_caller_user_id` parameter and check it ourselves.
--
-- Usage (service-role only, via supabase-js rpc or PostgREST):
--
--   SELECT public.qa_backdate_session(
--     p_session_id    => 'uuid',
--     p_age_hours     => 5,
--     p_caller_user_id => auth.uid()
--   );
--
-- Returns the new `updated_at` value for audit.

CREATE OR REPLACE FUNCTION public.qa_backdate_session(
  p_session_id uuid,
  p_age_hours  integer,
  p_caller_user_id uuid
) RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_ts     timestamptz;
  owner_id   uuid;
BEGIN
  -- Validate inputs
  IF p_age_hours < 0 OR p_age_hours > 72 THEN
    RAISE EXCEPTION 'p_age_hours must be between 0 and 72 (got %)', p_age_hours;
  END IF;

  -- Ownership check — caller must own the session
  SELECT s.owner_id INTO owner_id
  FROM public.sessions s
  WHERE s.id = p_session_id;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'session_not_found: %', p_session_id;
  END IF;

  IF owner_id <> p_caller_user_id THEN
    RAISE EXCEPTION 'forbidden: caller % does not own session % (owner=%)',
      p_caller_user_id, p_session_id, owner_id;
  END IF;

  new_ts := now() - (p_age_hours || ' hours')::interval;

  -- Bypass the BEFORE-UPDATE trigger by setting session_replication_role.
  -- `replica` mode skips ALL user triggers including trg_sessions_updated_at.
  -- Scoped to this transaction via `SET LOCAL`, so subsequent queries in
  -- other sessions are unaffected.
  SET LOCAL session_replication_role = 'replica';

  UPDATE public.sessions
  SET updated_at = new_ts
  WHERE id = p_session_id;

  -- Implicit RESET via transaction boundary — SET LOCAL only lasts for
  -- this txn. Belt-and-suspenders:
  SET LOCAL session_replication_role = 'origin';

  RETURN new_ts;
END;
$$;

COMMENT ON FUNCTION public.qa_backdate_session(uuid, integer, uuid) IS
'QA helper (Epic 12 W3.1-T1 smoke). Backdates sessions.updated_at bypassing the auto-update trigger. Service-role only. Owner-scoped.';

REVOKE ALL ON FUNCTION public.qa_backdate_session(uuid, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qa_backdate_session(uuid, integer, uuid) TO service_role;

-- Backout (if needed):
--   DROP FUNCTION public.qa_backdate_session(uuid, integer, uuid);
