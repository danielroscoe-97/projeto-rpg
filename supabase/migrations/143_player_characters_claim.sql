-- 143_player_characters_claim.sql
-- Epic 01 (Player Identity & Continuity) Story 01-B Area 4
--
-- Problem: DMs often pre-create characters for a campaign (e.g., the DM
-- builds 5 pre-gens before the session). When a player joins, they need to
-- "claim" one. Today there is no soft-claim mechanism for anon players:
-- the only way to own a character is to have user_id set (auth user).
--
-- Design: two-tier claim model.
--   - "Soft claim" (anon): claimed_by_session_token populated; user_id still
--     NULL. Temporary reservation linked to a session_token. Promoted to
--     "hard claim" when the player upgrades identity (saga step 4 of
--     upgradePlayerIdentity).
--   - "Hard claim" (auth): user_id populated. Player has full ownership and
--     standard RLS edit rights.
--
-- Decision (Dani_ 2026-04-19): claim = FULL ownership transfer. Player can
-- edit every field (name, class, stats, description) after hard claim. No
-- fields are locked because "DM created it".
--
-- Race guard: claim endpoints must use atomic UPDATE with WHERE clause
-- (see lib/supabase/character-claim.ts Story 01-C) to prevent two players
-- claiming the same character simultaneously.

-- (1) Schema change.
alter table player_characters
  add column claimed_by_session_token uuid null
    references session_tokens(id) on delete set null;

create index if not exists idx_player_characters_claimed_by_session_token
  on player_characters(claimed_by_session_token);

-- (2) RLS policy for soft-claim UPDATE.
--     Anon player who soft-claimed a character must be able to edit it
--     (name, stats, etc.) even before hard-claim promotion. This policy
--     scopes that right to (a) characters with a soft claim set and
--     (b) session_tokens owned by the current anon user.
--
--     Existing RLS policies for auth user (user_id = auth.uid()) remain
--     unchanged — they handle the post-upgrade hard-claim case.
drop policy if exists player_characters_soft_claim_update on player_characters;
create policy player_characters_soft_claim_update on player_characters
  for update
  using (
    claimed_by_session_token is not null
    and claimed_by_session_token in (
      select id from session_tokens where anon_user_id = auth.uid()
    )
  )
  with check (
    -- Anon can only mutate rows they still soft-own. Once hard claim
    -- happens (user_id set), this policy stops matching and the normal
    -- user_id-based policies take over.
    claimed_by_session_token in (
      select id from session_tokens where anon_user_id = auth.uid()
    )
  );

-- (3) Matching SELECT policy so soft-claim-holding anon can read the
--     character they own (needed by CharacterPickerModal "my pick" tab
--     when player is anon).
drop policy if exists player_characters_soft_claim_select on player_characters;
create policy player_characters_soft_claim_select on player_characters
  for select using (
    claimed_by_session_token is not null
    and claimed_by_session_token in (
      select id from session_tokens where anon_user_id = auth.uid()
    )
  );

-- Rollback:
--   drop policy if exists player_characters_soft_claim_select on player_characters;
--   drop policy if exists player_characters_soft_claim_update on player_characters;
--   drop index if exists idx_player_characters_claimed_by_session_token;
--   alter table player_characters drop column if exists claimed_by_session_token;
--   (Any soft-claim data is lost — acceptable on rollback.)

-- Smoke test (run post-apply in staging):
--
--   -- 1. Column + FK exist.
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_name = 'player_characters' and column_name = 'claimed_by_session_token';
--
--   -- 2. Index exists.
--   select indexname from pg_indexes
--    where tablename = 'player_characters'
--      and indexname = 'idx_player_characters_claimed_by_session_token';
--
--   -- 3. Both RLS policies exist.
--   select polname from pg_policy
--    where polrelid = 'player_characters'::regclass
--      and polname like 'player_characters_soft_claim_%';
--   -- Expect 2 rows.
--
--   -- 4. Atomic claim race test (run in 2 psql sessions):
--   --    session A:  begin;
--   --                update player_characters
--   --                  set claimed_by_session_token = '<token-A-id>'
--   --                 where id = '<char-id>'
--   --                   and user_id is null
--   --                   and claimed_by_session_token is null
--   --                returning id;
--   --    session B (concurrent, before A commits):
--   --                begin;
--   --                update player_characters
--   --                  set claimed_by_session_token = '<token-B-id>'
--   --                 where id = '<char-id>'
--   --                   and user_id is null
--   --                   and claimed_by_session_token is null
--   --                returning id;   -- should block on session A's lock
--   --    session A:  commit;
--   --    session B:  -- now returns 0 rows (claim lost the race).
--   --                rollback;
