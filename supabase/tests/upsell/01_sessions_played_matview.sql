-- 01_sessions_played_matview.sql
-- Epic 04 (Player-as-DM Upsell), Story 04-A4 — Test 11 validation gate.
--
-- F12 claim: pre-upgrade sessions played as an anon user re-attribute to the
-- authenticated user on the next REFRESH MATERIALIZED VIEW, because the
-- matview joins via player_characters.user_id (which Story 01-E rewrites
-- in place during upgrade).
--
-- Migration under test: 165_v_player_sessions_played.sql.
--
-- Test layout:
--   1. Create anon user "anon_A" (row in auth.users with is_anonymous = true).
--   2. Seed 3 completed-combat sessions owned by a DM, each with an encounter
--      that has at least one defeated combatant (required by the matview's
--      EXISTS is_defeated predicate) and a combatant linked to anon_A's
--      player_character.
--   3. REFRESH MATERIALIZED VIEW. Assert v_player_sessions_played returns
--      sessions_played = 3 for anon_A.
--   4. Simulate Story 01-E upgrade: UPDATE player_characters.user_id to a new
--      auth UUID (auth_A). Post-upgrade Supabase has anon_A.auth.users row
--      still present (or removed — doesn't matter; we're testing PC FK).
--   5. REFRESH MATERIALIZED VIEW CONCURRENTLY not used (see NOTE below).
--   6. Assert v_player_sessions_played now returns sessions_played = 3 for
--      auth_A.
--   7. Impersonate auth_A and assert my_sessions_played wrapper view returns
--      the same 3.
--
-- NOTE: REFRESH MATERIALIZED VIEW CONCURRENTLY cannot run inside a
-- transaction block. pgTap wraps each file in begin/rollback. We therefore
-- use non-concurrent REFRESH, which locks the matview briefly but works
-- inside a tx. The production cron refreshes CONCURRENTLY, but the
-- *correctness* of the aggregation does not differ between the two forms.
-- This keeps the test hermetic and aligned with pgTap conventions.

begin;
select plan(3);

select helpers.test_clear_auth();
set local role postgres;

-- ---------------------------------------------------------------------------
-- Persona setup
-- ---------------------------------------------------------------------------
--   anon_A: anonymous user who plays 3 sessions.
--   auth_A: the authenticated user anon_A upgrades into (new UUID).
--   dm:     DM who owns the campaign + sessions.

select helpers.test_setup_user('dm-04a4@example.com');
select helpers.test_clear_auth();
set local role postgres;

create temp table t_ids (
  dm_uid       uuid,
  anon_a_uid   uuid default gen_random_uuid(),
  auth_a_uid   uuid default gen_random_uuid(),
  campaign_id  uuid default gen_random_uuid(),
  pc_id        uuid default gen_random_uuid(),
  session_1_id uuid default gen_random_uuid(),
  session_2_id uuid default gen_random_uuid(),
  session_3_id uuid default gen_random_uuid(),
  enc_1_id     uuid default gen_random_uuid(),
  enc_2_id     uuid default gen_random_uuid(),
  enc_3_id     uuid default gen_random_uuid()
);
insert into t_ids (dm_uid) values (
  (select id from auth.users where email = 'dm-04a4@example.com')
);

-- Seed anon_A as anonymous auth user. The upgrade destination auth_A is
-- pre-created so the post-upgrade state is valid (player_characters.user_id
-- FK → auth.users.id). email=NULL mirrors signInAnonymously()'s behaviour
-- and dodges the handle_new_auth_user profile trigger (migration 015/048).
insert into auth.users (id, email, aud, role, created_at, updated_at, is_anonymous)
select
  anon_a_uid,
  NULL,
  'authenticated', 'authenticated', now(), now(), true
from t_ids;

insert into auth.users (id, email, aud, role, created_at, updated_at, is_anonymous)
select
  auth_a_uid,
  'auth-a-04a4@example.com',
  'authenticated', 'authenticated', now(), now(), false
from t_ids;

-- auth_A's public.users profile row is created automatically by the
-- handle_new_auth_user trigger (migrations 015/048) when we inserted
-- the auth.users row above. No explicit insert needed.

-- Campaign + player_character linked to anon_A.
insert into campaigns (id, owner_id, name)
select campaign_id, dm_uid, 'Campaign 04-A4' from t_ids;

insert into player_characters (id, campaign_id, name, max_hp, current_hp, ac, user_id)
select pc_id, campaign_id, 'Player A anon-pc', 30, 30, 14, anon_a_uid from t_ids;

-- 3 sessions, each with an encounter and at least one defeated combatant.
insert into sessions (id, campaign_id, owner_id, name)
select session_1_id, campaign_id, dm_uid, 'Session 1' from t_ids;
insert into sessions (id, campaign_id, owner_id, name)
select session_2_id, campaign_id, dm_uid, 'Session 2' from t_ids;
insert into sessions (id, campaign_id, owner_id, name)
select session_3_id, campaign_id, dm_uid, 'Session 3' from t_ids;

insert into encounters (id, session_id, name)
select enc_1_id, session_1_id, 'Encounter 1' from t_ids;
insert into encounters (id, session_id, name)
select enc_2_id, session_2_id, 'Encounter 2' from t_ids;
insert into encounters (id, session_id, name)
select enc_3_id, session_3_id, 'Encounter 3' from t_ids;

-- Player combatants (one per encounter, linked to anon_A's PC).
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_player, player_character_id)
select enc_1_id, 'Player A', 30, 30, 14, true, pc_id from t_ids;
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_player, player_character_id)
select enc_2_id, 'Player A', 30, 30, 14, true, pc_id from t_ids;
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_player, player_character_id)
select enc_3_id, 'Player A', 30, 30, 14, true, pc_id from t_ids;

-- Defeated monster combatants (required by matview's EXISTS is_defeated
-- predicate — at least one combatant per encounter must be is_defeated = true).
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_defeated)
select enc_1_id, 'Goblin', 0, 7, 15, true from t_ids;
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_defeated)
select enc_2_id, 'Orc', 0, 15, 13, true from t_ids;
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_defeated)
select enc_3_id, 'Zombie', 0, 22, 8, true from t_ids;

-- ---------------------------------------------------------------------------
-- TEST 1: Pre-upgrade — anon_A has sessions_played = 3 after refresh.
-- ---------------------------------------------------------------------------
refresh materialized view v_player_sessions_played;

select is(
  (select sessions_played from v_player_sessions_played
     where user_id = (select anon_a_uid from t_ids)),
  3,
  'v_player_sessions_played reports sessions_played=3 for anon_A pre-upgrade'
);

-- ---------------------------------------------------------------------------
-- TEST 2: Simulate Story 01-E upgrade — UPDATE player_characters.user_id
-- in place. After refresh, sessions attribute to auth_A (F12).
-- ---------------------------------------------------------------------------
update player_characters
   set user_id = (select auth_a_uid from t_ids)
 where id = (select pc_id from t_ids);

refresh materialized view v_player_sessions_played;

select is(
  (select sessions_played from v_player_sessions_played
     where user_id = (select auth_a_uid from t_ids)),
  3,
  'F12: sessions re-attribute to auth_A after player_characters.user_id rewrite + refresh'
);

-- ---------------------------------------------------------------------------
-- TEST 3: my_sessions_played wrapper view filters by auth.uid(). Impersonate
-- auth_A and assert we see exactly one row with sessions_played = 3.
-- ---------------------------------------------------------------------------
-- auth_A already has a public.users row (we seeded it above), so the helper
-- just re-uses the existing row and sets the JWT claim to that UUID.
select helpers.test_setup_user('auth-a-04a4@example.com');

select is(
  (select sessions_played from my_sessions_played),
  3,
  'my_sessions_played (filtered by auth.uid) returns 3 for the upgraded auth_A'
);

select * from finish();
rollback;
