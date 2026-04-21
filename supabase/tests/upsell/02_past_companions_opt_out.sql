-- 02_past_companions_opt_out.sql
-- Epic 04 (Player-as-DM Upsell), Story 04-A4 — Test 12 + Bonus M9.
--
-- Test 12 (D8 opt-out filtering):
--   Two users A and B share a session (both have player_characters +
--   combatants in the same encounter, and that encounter has a defeated
--   combatant).
--     - Set users.share_past_companions = false for user B.
--     - get_past_companions() as user A → B must NOT appear.
--     - Set it back to true → B must appear.
--
-- M9 behaviour (revised by migration 173 — H3 follow-up):
--   A companion whose player_characters.user_id matches an auth.users id
--   but has NO corresponding public.users row must NOT appear in the
--   result. This used to be the M9 "visibility fallback" with display_name
--   = '(?)', but that was vulnerable to an opt-out bypass where a
--   privacy-deleted profile would resurface the companion. 173/H3 hardens
--   the function to require a profile row.
--
-- Migrations under test: 169 + 172 + 173 (all CREATE OR REPLACE the
-- same function body; 173 is the current definition).

begin;
select plan(4);

select helpers.test_clear_auth();
set local role postgres;

-- ---------------------------------------------------------------------------
-- Personas:
--   user_a (auth)     — the caller; queries get_past_companions().
--   user_b (auth)     — companion with opt-out toggle.
--   user_c (anon-ish) — companion with NO public.users profile row
--                       (M9 fallback case). We create auth.users but skip
--                       public.users to simulate a legacy / post-upgrade-race row.
--   dm                — owns the campaign + sessions.
-- ---------------------------------------------------------------------------

select helpers.test_setup_user('user-a-04a4@example.com');
select helpers.test_setup_user('user-b-04a4@example.com');
select helpers.test_setup_user('dm-04a4-optout@example.com');
select helpers.test_clear_auth();
set local role postgres;

create temp table t_ids (
  user_a_uid   uuid,
  user_b_uid   uuid,
  dm_uid       uuid,
  user_c_uid   uuid default gen_random_uuid(),
  campaign_id  uuid default gen_random_uuid(),
  session_id   uuid default gen_random_uuid(),
  encounter_id uuid default gen_random_uuid(),
  pc_a_id      uuid default gen_random_uuid(),
  pc_b_id      uuid default gen_random_uuid(),
  pc_c_id      uuid default gen_random_uuid()
);
insert into t_ids (user_a_uid, user_b_uid, dm_uid) values (
  (select id from auth.users where email = 'user-a-04a4@example.com'),
  (select id from auth.users where email = 'user-b-04a4@example.com'),
  (select id from auth.users where email = 'dm-04a4-optout@example.com')
);

-- Create user_c WITHOUT a public.users profile row (M9 case).
-- We use the anonymous-user shape (email NULL + is_anonymous=true) so the
-- handle_new_auth_user trigger (migration 015/048) skips profile creation.
-- This mirrors the real-world M9 trigger: an anon player whose PC was
-- created before any upgrade / profile sync.
insert into auth.users (id, email, aud, role, created_at, updated_at, is_anonymous)
select
  user_c_uid,
  NULL,
  'authenticated', 'authenticated', now(), now(), true
from t_ids;
-- Defensively delete any public.users row that a yet-undiscovered trigger
-- may have created. Idempotent.
delete from public.users where id = (select user_c_uid from t_ids);

insert into campaigns (id, owner_id, name)
select campaign_id, dm_uid, 'Opt-out Campaign' from t_ids;

insert into player_characters (id, campaign_id, name, max_hp, current_hp, ac, user_id)
select pc_a_id, campaign_id, 'Player A PC', 30, 30, 14, user_a_uid from t_ids;

insert into player_characters (id, campaign_id, name, max_hp, current_hp, ac, user_id)
select pc_b_id, campaign_id, 'Player B PC', 28, 28, 15, user_b_uid from t_ids;

insert into player_characters (id, campaign_id, name, max_hp, current_hp, ac, user_id)
select pc_c_id, campaign_id, 'Player C PC (no profile)', 25, 25, 13, user_c_uid from t_ids;

insert into sessions (id, campaign_id, owner_id, name)
select session_id, campaign_id, dm_uid, 'Shared session' from t_ids;

insert into encounters (id, session_id, name)
select encounter_id, session_id, 'Shared encounter' from t_ids;

-- Player combatants (all three players in same encounter → they share
-- the session).
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_player, player_character_id)
select encounter_id, 'A', 30, 30, 14, true, pc_a_id from t_ids;
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_player, player_character_id)
select encounter_id, 'B', 28, 28, 15, true, pc_b_id from t_ids;
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_player, player_character_id)
select encounter_id, 'C', 25, 25, 13, true, pc_c_id from t_ids;

-- At least one defeated combatant so the session counts as "played".
-- (The matview requires this; get_past_companions indirectly relies on
-- "shared session" which doesn't gate on is_defeated, but we keep the
-- fixture consistent with other tests.)
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_defeated)
select encounter_id, 'Goblin', 0, 7, 15, true from t_ids;

-- Helper: snapshot of get_past_companions() for user_a, as a temp function.
-- We cannot SELECT from within throws_ok, so we rebuild personally.
-- Instead, we impersonate user_a and call the RPC directly in each assertion.

-- ---------------------------------------------------------------------------
-- TEST 1 (default state: user_b.share_past_companions = true).
-- user_a calls get_past_companions() → expects BOTH user_b and user_c.
-- ---------------------------------------------------------------------------
select helpers.test_setup_user('user-a-04a4@example.com');

select is(
  (select count(*)::int from get_past_companions()
     where companion_user_id = (select user_b_uid from t_ids)),
  1,
  'T12-a: user_b appears in user_a''s past_companions when share=true (default)'
);

-- ---------------------------------------------------------------------------
-- TEST 2 (H3 privacy hardening — 173): user_c does NOT appear at all,
-- because they have no public.users profile row. Closes the opt-out
-- bypass where a profile-deleted user would resurface post-deletion.
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from get_past_companions()
     where companion_user_id = (select user_c_uid from t_ids)),
  0,
  'H3: companion without public.users profile is excluded (no M9 fallback — protects against opt-out bypass)'
);

-- ---------------------------------------------------------------------------
-- TEST 3 (opt-out toggle): set user_b.share_past_companions = false.
-- ---------------------------------------------------------------------------
-- Must switch back to superuser to update users (user_a cannot update
-- user_b's profile).
set local role postgres;
select helpers.test_clear_auth();

update public.users
   set share_past_companions = false
 where id = (select user_b_uid from t_ids);

-- Re-impersonate user_a.
select helpers.test_setup_user('user-a-04a4@example.com');

select is(
  (select count(*)::int from get_past_companions()
     where companion_user_id = (select user_b_uid from t_ids)),
  0,
  'T12-b: user_b is filtered out of user_a''s past_companions when share=false'
);

-- ---------------------------------------------------------------------------
-- TEST 4 (toggle back): set share_past_companions = true → user_b reappears.
-- ---------------------------------------------------------------------------
set local role postgres;
select helpers.test_clear_auth();

update public.users
   set share_past_companions = true
 where id = (select user_b_uid from t_ids);

select helpers.test_setup_user('user-a-04a4@example.com');

select is(
  (select count(*)::int from get_past_companions()
     where companion_user_id = (select user_b_uid from t_ids)),
  1,
  'T12-c: user_b reappears after share_past_companions is toggled back to true'
);

select * from finish();
rollback;
