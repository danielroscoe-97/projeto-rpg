-- 145_player_characters_claim_rls_fix.sql
-- Epic 01 (Player Identity & Continuity) — fix from adversarial review
--
-- Problem: migration 143 RLS policy `player_characters_soft_claim_update`
-- allows an anon player to UPDATE a soft-claimed character, but the policy
-- does NOT guard against the anon player also setting `user_id = auth.uid()`
-- in the same UPDATE — effectively self-promoting from soft to hard claim
-- bypassing the upgradePlayerIdentity saga.
--
-- Design intent (re-stated): promotion from soft → hard claim happens
-- EXCLUSIVELY inside the server action `upgradePlayerIdentity` (Story 01-E),
-- which runs server-side with full input validation. Client-side UPDATE by
-- an anon session MUST NOT be able to set `user_id`.
--
-- Fix: tighten both `using` and `with check` clauses to require
-- `user_id IS NULL` — the row must be (and must remain) in the soft-claim
-- state for the anon policy to apply. Once user_id is set, only the normal
-- `user_id = auth.uid()` policy matches, preventing further anon mutation.
--
-- Additional: add missing index on users.default_character_id (dashboard
-- join performance; flagged MEDIUM-5 in the same review).

-- (1) Replace soft-claim UPDATE policy with tightened version.
drop policy if exists player_characters_soft_claim_update on player_characters;
create policy player_characters_soft_claim_update on player_characters
  for update
  using (
    -- Row must currently be in soft-claim state AND belong to current anon.
    user_id is null
    and claimed_by_session_token is not null
    and claimed_by_session_token in (
      select id from session_tokens where anon_user_id = auth.uid()
    )
  )
  with check (
    -- Post-UPDATE: must REMAIN in soft-claim state. user_id cannot be set
    -- via this policy. claimed_by_session_token must still point to a token
    -- the anon user owns (prevents re-assigning claim to another player).
    user_id is null
    and claimed_by_session_token in (
      select id from session_tokens where anon_user_id = auth.uid()
    )
  );

-- (2) Tighten SELECT policy similarly — symmetry with UPDATE. Anon sees
--     soft-claimed characters only while they are still soft-claimed.
--     (If promoted to hard claim, user's own auth.uid() = user_id policy
--     takes over — no gap in visibility.)
drop policy if exists player_characters_soft_claim_select on player_characters;
create policy player_characters_soft_claim_select on player_characters
  for select using (
    user_id is null
    and claimed_by_session_token is not null
    and claimed_by_session_token in (
      select id from session_tokens where anon_user_id = auth.uid()
    )
  );

-- (3) Index for dashboard query joining users.default_character_id →
--     player_characters.id. Partial (only rows where default is set).
create index if not exists idx_users_default_character_id
  on users(default_character_id)
  where default_character_id is not null;

-- Rollback:
--   drop index if exists idx_users_default_character_id;
--   -- Restore the pre-145 (post-143) policies — do NOT simply `drop policy`,
--   -- because that leaves RLS enforced with no policy = deny-all for anon.
--   drop policy if exists player_characters_soft_claim_select on player_characters;
--   create policy player_characters_soft_claim_select on player_characters
--     for select using (
--       claimed_by_session_token is not null
--       and claimed_by_session_token in (
--         select id from session_tokens where anon_user_id = auth.uid()
--       )
--     );
--   drop policy if exists player_characters_soft_claim_update on player_characters;
--   create policy player_characters_soft_claim_update on player_characters
--     for update
--     using (
--       claimed_by_session_token is not null
--       and claimed_by_session_token in (
--         select id from session_tokens where anon_user_id = auth.uid()
--       )
--     )
--     with check (
--       claimed_by_session_token in (
--         select id from session_tokens where anon_user_id = auth.uid()
--       )
--     );

-- Smoke test (run post-apply in staging):
--
--   -- 1. Policies exist and contain the new guards.
--   select polname, pg_get_expr(polqual, polrelid) as using_clause,
--          pg_get_expr(polwithcheck, polrelid) as check_clause
--     from pg_policy
--    where polrelid = 'player_characters'::regclass
--      and polname like 'player_characters_soft_claim_%';
--   -- Both clauses must mention "user_id IS NULL".
--
--   -- 2. Anon cannot self-promote (negative test in staging with an anon JWT):
--   --    update player_characters
--   --    set user_id = '<anon auth uid>', claimed_by_session_token = null
--   --    where id = '<char with soft claim by this anon>';
--   --    Expected: 0 rows affected (blocked by RLS with check).
--
--   -- 3. Index exists.
--   select indexname from pg_indexes
--    where tablename = 'users' and indexname = 'idx_users_default_character_id';
