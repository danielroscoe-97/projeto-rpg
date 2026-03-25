-- 007_fix_rls_recursion.sql
-- Fix infinite recursion in RLS policies caused by users_admin_select
-- querying the users table (which re-evaluates users policies → loop)
--
-- Solution: SECURITY DEFINER function bypasses RLS for the admin check.

-- Step 1: Create a helper function that checks admin status without RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- Step 2: Drop the recursive policy on users
DROP POLICY IF EXISTS users_admin_select ON users;

-- Step 3: Recreate users admin policy using the helper function
CREATE POLICY users_admin_select ON users
  FOR SELECT USING (public.is_admin());

-- Step 4: Replace all other admin policies that query users directly

-- campaigns
DROP POLICY IF EXISTS campaigns_admin_select ON campaigns;
CREATE POLICY campaigns_admin_select ON campaigns
  FOR SELECT USING (public.is_admin());

-- sessions
DROP POLICY IF EXISTS sessions_admin_select ON sessions;
CREATE POLICY sessions_admin_select ON sessions
  FOR SELECT USING (public.is_admin());

-- monsters
DROP POLICY IF EXISTS monsters_admin_insert ON monsters;
CREATE POLICY monsters_admin_insert ON monsters
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS monsters_admin_update ON monsters;
CREATE POLICY monsters_admin_update ON monsters
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS monsters_admin_delete ON monsters;
CREATE POLICY monsters_admin_delete ON monsters
  FOR DELETE USING (public.is_admin());

-- spells
DROP POLICY IF EXISTS spells_admin_insert ON spells;
CREATE POLICY spells_admin_insert ON spells
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS spells_admin_update ON spells;
CREATE POLICY spells_admin_update ON spells
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS spells_admin_delete ON spells;
CREATE POLICY spells_admin_delete ON spells
  FOR DELETE USING (public.is_admin());

-- condition_types
DROP POLICY IF EXISTS condition_types_admin_insert ON condition_types;
CREATE POLICY condition_types_admin_insert ON condition_types
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS condition_types_admin_update ON condition_types;
CREATE POLICY condition_types_admin_update ON condition_types
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS condition_types_admin_delete ON condition_types;
CREATE POLICY condition_types_admin_delete ON condition_types
  FOR DELETE USING (public.is_admin());
