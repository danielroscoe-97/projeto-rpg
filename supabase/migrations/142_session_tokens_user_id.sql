-- 142_session_tokens_user_id.sql
-- Epic 01 (Player Identity & Continuity) Story 01-B Area 1
--
-- Problem: session_tokens.anon_user_id is the only linkage to auth.users,
-- and that column can REGENERATE on cookie loss (per spec-resilient-reconnection
-- §2.4). Post-upgrade (anon → auth via supabase.auth.updateUser), we need a
-- stable, distinct column to mark "this session_token belongs to an
-- authenticated user" without relying on anon_user_id.
--
-- Design:
--   (1) Add user_id column (nullable, FK to auth.users with ON DELETE SET NULL).
--   (2) Index for "sessions this user has played" queries.
--   (3) Add SELECT policy permitting the user to read their own rows via
--       either anon identity OR authenticated identity.
--
-- Invariants after this migration:
--   - user_id IS NULL while session_token is still anon-only.
--   - user_id = auth.uid() after upgradePlayerIdentity() promotes.
--   - anon_user_id and user_id can co-exist (same UUID post-upgrade because
--     supabase.auth.updateUser preserves the UUID — design decision DC1 of
--     the iniciativa; see docs/epics/player-identity/epic-01-identity-foundation.md).
--   - session_tokens.id remains the stable cross-reference key (DC4) — never
--     use anon_user_id or user_id for WHERE-clauses when session_tokens.id
--     is available.

-- (1) Schema change.
alter table session_tokens
  add column user_id uuid null references auth.users(id) on delete set null;

-- (2) Index to accelerate "sessions this user played" queries (dashboard
--     continuity section, history, past-companions view consumed by Epic 04).
create index if not exists idx_session_tokens_user_id
  on session_tokens(user_id);

-- (3) SELECT policy. A user can read session_tokens they own via either
--     identity path. UPDATE/DELETE policies are not changed here — app
--     code (server actions) handles writes with service-role or RLS-aware
--     queries; UI does not mutate session_tokens directly.
--
--     Note: if a policy with this name already exists, we replace it.
drop policy if exists session_tokens_select_own on session_tokens;
create policy session_tokens_select_own on session_tokens
  for select using (
    user_id = auth.uid() or anon_user_id = auth.uid()
  );

-- Rollback:
--   drop policy if exists session_tokens_select_own on session_tokens;
--   drop index if exists idx_session_tokens_user_id;
--   alter table session_tokens drop column if exists user_id;
--   (Any rows where user_id was populated will lose that linkage — acceptable
--    because rollback implies the iniciativa didn't ship.)

-- Smoke test (run post-apply in staging):
--
--   -- 1. Column + FK exist.
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_name = 'session_tokens' and column_name = 'user_id';
--   -- Expect: user_id | uuid | YES
--
--   -- 2. Index exists.
--   select indexname from pg_indexes
--    where tablename = 'session_tokens' and indexname = 'idx_session_tokens_user_id';
--
--   -- 3. RLS policy exists.
--   select polname from pg_policy
--    where polrelid = 'session_tokens'::regclass
--      and polname = 'session_tokens_select_own';
--
--   -- 4. Existing rows have user_id = NULL (no backfill intended; population
--   --    happens via upgradePlayerIdentity server action on demand).
--   select count(*) filter (where user_id is null) as still_anon,
--          count(*) filter (where user_id is not null) as already_auth
--     from session_tokens;
--   -- Expect still_anon = total pre-migration; already_auth = 0.
