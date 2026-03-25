-- 011_fix_session_token_rls_recursion.sql
-- Fix infinite recursion between sessions and session_tokens RLS policies.
--
-- The cycle: sessions_player_select → session_tokens → session_tokens_owner_select → sessions → …
-- Same pattern as 009_fix_rls_recursion.sql (users_admin_select).
--
-- Solution: SECURITY DEFINER function that checks session ownership without RLS.

CREATE OR REPLACE FUNCTION public.is_session_owner(_session_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sessions
    WHERE id = _session_id AND owner_id = auth.uid()
  );
$$;

-- Recreate session_tokens policies that reference sessions to use the helper

DROP POLICY IF EXISTS session_tokens_owner_select ON session_tokens;
CREATE POLICY session_tokens_owner_select ON session_tokens
  FOR SELECT USING (public.is_session_owner(session_id));

DROP POLICY IF EXISTS session_tokens_owner_insert ON session_tokens;
CREATE POLICY session_tokens_owner_insert ON session_tokens
  FOR INSERT WITH CHECK (public.is_session_owner(session_id));

DROP POLICY IF EXISTS session_tokens_owner_update ON session_tokens;
CREATE POLICY session_tokens_owner_update ON session_tokens
  FOR UPDATE USING (public.is_session_owner(session_id));

DROP POLICY IF EXISTS session_tokens_owner_delete ON session_tokens;
CREATE POLICY session_tokens_owner_delete ON session_tokens
  FOR DELETE USING (public.is_session_owner(session_id));

-- Also fix encounters policies that reference sessions (same potential recursion
-- if any future policy on sessions references encounters)

DROP POLICY IF EXISTS encounters_owner_select ON encounters;
CREATE POLICY encounters_owner_select ON encounters
  FOR SELECT USING (public.is_session_owner(session_id));

DROP POLICY IF EXISTS encounters_owner_insert ON encounters;
CREATE POLICY encounters_owner_insert ON encounters
  FOR INSERT WITH CHECK (public.is_session_owner(session_id));

DROP POLICY IF EXISTS encounters_owner_update ON encounters;
CREATE POLICY encounters_owner_update ON encounters
  FOR UPDATE USING (public.is_session_owner(session_id));

DROP POLICY IF EXISTS encounters_owner_delete ON encounters;
CREATE POLICY encounters_owner_delete ON encounters
  FOR DELETE USING (public.is_session_owner(session_id));
