-- supabase/tests/helpers/setup.sql
-- Shared helpers for pgTap RLS tests. Loaded ONCE by scripts/test-pgtap.sh
-- before the test files run. Do NOT wrap in begin/rollback here — these
-- objects must persist across test files.
--
-- Why a dedicated `helpers` schema?
--   - Keeps test fixtures out of `public` (prevents "wait, is that a prod
--     function?" confusion if someone greps the DB).
--   - GRANT to authenticated is explicit and narrow.

create schema if not exists helpers;

-- ---------------------------------------------------------------------------
-- helpers.test_setup_user(email)
-- ---------------------------------------------------------------------------
-- Creates (or re-uses) a fake auth.users row + public.users profile row for
-- the given email, then sets `request.jwt.claims` such that `auth.uid()`
-- returns that user's UUID for the remainder of the current transaction.
--
-- Returns the user's UUID so callers can JOIN on it.
--
-- Usage:
--   select helpers.test_setup_user('alice@example.com');  -- returns uuid
--   -- now auth.uid() = alice's uuid for the rest of this tx
--
-- Safety:
--   - Idempotent: re-using an email returns the same UUID.
--   - Transaction-scoped: the JWT claim is set via `set local`, so it
--     unwinds on rollback. No persona leak across test files (each file
--     wraps itself in begin/rollback per the README convention).
--   - pg_advisory_xact_lock on a hash of the email so two tests running
--     simultaneously against the same email don't race on insert. The lock
--     is released at commit/rollback automatically.
-- ---------------------------------------------------------------------------
create or replace function helpers.test_setup_user(p_email text)
returns uuid
language plpgsql
as $$
declare
  v_uid uuid;
begin
  -- Serialise concurrent inserts for the same email. Hash → bigint for the
  -- advisory lock key. Released on tx end.
  perform pg_advisory_xact_lock(hashtext('helpers.test_setup_user:' || p_email));

  -- Re-use existing user if present (idempotent across files).
  select id into v_uid from auth.users where email = p_email;

  if v_uid is null then
    v_uid := gen_random_uuid();

    -- Minimal auth.users row. We skip the full password/email_confirmed flow
    -- because RLS only reads `id`. If your policy reads other auth.users
    -- columns, extend this INSERT accordingly.
    insert into auth.users (id, email, aud, role, created_at, updated_at)
    values (v_uid, p_email, 'authenticated', 'authenticated', now(), now());

    -- Mirror to public.users (required by several RLS policies that JOIN
    -- on users table — e.g. admin checks in migration 005).
    insert into public.users (id, email, display_name)
    values (v_uid, p_email, split_part(p_email, '@', 1))
    on conflict (id) do nothing;
  end if;

  -- Impersonate: auth.uid() reads request.jwt.claims->>'sub'. `set local`
  -- so the change unwinds at tx end.
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', v_uid::text,
      'email', p_email,
      'role', 'authenticated'
    )::text,
    true  -- is_local
  );

  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  perform set_config('role', 'authenticated', true);

  return v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- helpers.test_setup_anon(anon_uid)
-- ---------------------------------------------------------------------------
-- Like test_setup_user but for an anonymous Supabase session (no public.users
-- row, since anon users don't have a profile). Used by soft-claim tests that
-- need auth.uid() to match session_tokens.anon_user_id.
-- ---------------------------------------------------------------------------
create or replace function helpers.test_setup_anon(p_anon_uid uuid default gen_random_uuid())
returns uuid
language plpgsql
as $$
begin
  perform pg_advisory_xact_lock(hashtext('helpers.test_setup_anon:' || p_anon_uid::text));

  -- anon users have a row in auth.users but NO profile in public.users.
  insert into auth.users (id, email, aud, role, created_at, updated_at, is_anonymous)
  values (
    p_anon_uid,
    'anon-' || replace(p_anon_uid::text, '-', '') || '@anon.local',
    'authenticated',
    'authenticated',
    now(),
    now(),
    true
  )
  on conflict (id) do nothing;

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_anon_uid::text,
      'role', 'authenticated',
      'is_anonymous', true
    )::text,
    true
  );
  perform set_config('request.jwt.claim.sub', p_anon_uid::text, true);
  perform set_config('role', 'authenticated', true);

  return p_anon_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- helpers.test_clear_auth()
-- ---------------------------------------------------------------------------
-- Clear JWT claims so auth.uid() returns NULL. Use between personas in a
-- test that verifies "unauthenticated users see nothing".
-- ---------------------------------------------------------------------------
create or replace function helpers.test_clear_auth()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: allow test runs as `authenticated` to call these helpers.
-- In production we never install this schema, so no real risk.
-- ---------------------------------------------------------------------------
grant usage on schema helpers to authenticated, anon;
grant execute on function helpers.test_setup_user(text) to authenticated, anon;
grant execute on function helpers.test_setup_anon(uuid) to authenticated, anon;
grant execute on function helpers.test_clear_auth() to authenticated, anon;
