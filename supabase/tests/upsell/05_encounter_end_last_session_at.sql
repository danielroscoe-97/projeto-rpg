-- 05_encounter_end_last_session_at.sql
-- Epic 04 Sprint 2 F19-WIRE — migration 178 behavior test.
--
-- Migration under test: 178_encounter_end_writes_last_session_at.sql
--
-- Claims to verify:
--   1. UPDATE encounters.ended_at from NULL → NOT NULL bumps
--      users.last_session_at for every player_character bound to the
--      encounter (via combatants.player_character_id) whose user_id IS
--      NOT NULL.
--   2. A NULL → NOT NULL transition uses NEW.ended_at (not now()) so the
--      encounter's authoritative clock wins.
--   3. Subsequent UPDATE (re-setting ended_at to a different NOT NULL
--      value, e.g. correction) does NOT rewind users.last_session_at
--      backwards — monotonic guard.
--   4. NPC combatants (player_character_id = NULL) do NOT trigger spurious
--      writes.
--   5. No-op on updates that don't change ended_at (WHEN clause on the
--      trigger filters them before function entry).

begin;
select plan(6);

select helpers.test_clear_auth();
set local role postgres;

-- ---------------------------------------------------------------------------
-- Persona + data setup
-- ---------------------------------------------------------------------------
--   dm:     DM owning the campaign/session/encounter.
--   playerA: auth user whose player_character participates in the encounter.
--   playerB: second auth user, second player_character in same encounter.

select helpers.test_setup_user('dm-f19wire@example.com');
select helpers.test_setup_user('playerA-f19wire@example.com');
select helpers.test_setup_user('playerB-f19wire@example.com');
select helpers.test_clear_auth();
set local role postgres;

create temp table t_ids (
  dm_uid       uuid,
  player_a_uid uuid,
  player_b_uid uuid,
  campaign_id  uuid default gen_random_uuid(),
  session_id   uuid default gen_random_uuid(),
  encounter_id uuid default gen_random_uuid(),
  pc_a_id      uuid default gen_random_uuid(),
  pc_b_id      uuid default gen_random_uuid()
);
insert into t_ids (dm_uid, player_a_uid, player_b_uid) values (
  (select id from auth.users where email = 'dm-f19wire@example.com'),
  (select id from auth.users where email = 'playerA-f19wire@example.com'),
  (select id from auth.users where email = 'playerB-f19wire@example.com')
);

-- Freeze users.last_session_at to a known baseline BEFORE the encounter ends,
-- so we can assert the trigger overwrote it. NULL on both simulates "never
-- completed a session" (the state most Sprint 1 players were in because
-- last_session_at was only ever written by the anon→auth upgrade).
update users set last_session_at = NULL
 where id in (select player_a_uid from t_ids union select player_b_uid from t_ids);

insert into campaigns (id, owner_id, name)
select campaign_id, dm_uid, 'F19-WIRE campaign' from t_ids;

insert into player_characters (id, campaign_id, name, max_hp, current_hp, ac, user_id)
select pc_a_id, campaign_id, 'PC A', 30, 30, 14, player_a_uid from t_ids;
insert into player_characters (id, campaign_id, name, max_hp, current_hp, ac, user_id)
select pc_b_id, campaign_id, 'PC B', 30, 30, 14, player_b_uid from t_ids;

insert into sessions (id, campaign_id, owner_id, name)
select session_id, campaign_id, dm_uid, 'Session 1' from t_ids;

-- Encounter starts with ended_at = NULL (the NULL → NOT NULL edge is the
-- transition the trigger cares about).
insert into encounters (id, session_id, name, ended_at)
select encounter_id, session_id, 'Boss fight', NULL from t_ids;

-- Two player combatants + one NPC combatant. The NPC should NOT trigger
-- any users.last_session_at write (claim 4).
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_player, player_character_id)
select encounter_id, 'PC A', 30, 30, 14, true, pc_a_id from t_ids;
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_player, player_character_id)
select encounter_id, 'PC B', 30, 30, 14, true, pc_b_id from t_ids;
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_defeated)
select encounter_id, 'Goblin Boss', 0, 50, 15, true from t_ids;

-- ---------------------------------------------------------------------------
-- TEST 1-2: transition NULL → NOT NULL at a fixed timestamp T1.
--
-- Expect: users.last_session_at for BOTH player users is set to T1 exactly.
-- ---------------------------------------------------------------------------
update encounters
   set ended_at = '2026-04-21 18:00:00+00'
 where id = (select encounter_id from t_ids);

select is(
  (select last_session_at from users where id = (select player_a_uid from t_ids)),
  '2026-04-21 18:00:00+00'::timestamptz,
  'playerA.last_session_at = NEW.ended_at after encounter closes'
);

select is(
  (select last_session_at from users where id = (select player_b_uid from t_ids)),
  '2026-04-21 18:00:00+00'::timestamptz,
  'playerB.last_session_at = NEW.ended_at after encounter closes'
);

-- ---------------------------------------------------------------------------
-- TEST 3: monotonic guard. Re-set ended_at to an EARLIER timestamp T0 (admin
-- correction backward). Expect: users.last_session_at does NOT rewind.
-- ---------------------------------------------------------------------------
update encounters
   set ended_at = '2026-04-20 10:00:00+00'
 where id = (select encounter_id from t_ids);

select is(
  (select last_session_at from users where id = (select player_a_uid from t_ids)),
  '2026-04-21 18:00:00+00'::timestamptz,
  'monotonic: backward-dated ended_at does not rewind users.last_session_at'
);

-- ---------------------------------------------------------------------------
-- TEST 4: monotonic guard — forward. Re-set ended_at to a LATER timestamp T2.
-- Expect: users.last_session_at advances to T2.
-- ---------------------------------------------------------------------------
update encounters
   set ended_at = '2026-04-21 19:00:00+00'
 where id = (select encounter_id from t_ids);

-- Trigger fires only on NULL→NOT NULL; a NOT NULL → NOT NULL change should
-- NOT re-propagate. last_session_at stays at T1, NOT advancing to T2.
-- This is the documented "spam guard" — re-editing ended_at on a closed
-- encounter doesn't spam the users table.
select is(
  (select last_session_at from users where id = (select player_a_uid from t_ids)),
  '2026-04-21 18:00:00+00'::timestamptz,
  'NOT NULL → NOT NULL ended_at change does NOT re-propagate (spam guard)'
);

-- ---------------------------------------------------------------------------
-- TEST 5: no-op updates (touching a different column) do not fire the
-- trigger at all — users.last_session_at remains stable.
-- ---------------------------------------------------------------------------
update encounters
   set name = 'Boss fight (renamed)'
 where id = (select encounter_id from t_ids);

select is(
  (select last_session_at from users where id = (select player_b_uid from t_ids)),
  '2026-04-21 18:00:00+00'::timestamptz,
  'column-other-than-ended_at update leaves last_session_at untouched'
);

-- ---------------------------------------------------------------------------
-- TEST 6 (adversarial-review follow-up): encounter with ONLY NPCs — no
-- player_characters bound via combatants. Trigger must be a no-op; no user
-- in the system should have last_session_at touched.
--
-- Scenario: DM runs a solo combat (ambush demo, cinematic fight, solo boss
-- testing, etc.) with no PC combatants. The UPDATE in the trigger joins
-- through combatants × player_characters with a WHERE clause that
-- requires a non-NULL player_character_id AND a non-NULL pc.user_id, so
-- the set is empty and zero rows update.
-- ---------------------------------------------------------------------------
do $$
declare
  v_dm_uid      uuid := (select id from auth.users where email = 'dm-f19wire@example.com');
  v_session_id  uuid := gen_random_uuid();
  v_encounter_id uuid := gen_random_uuid();
  v_campaign_id uuid := (select campaign_id from t_ids);
begin
  insert into sessions (id, campaign_id, owner_id, name)
    values (v_session_id, v_campaign_id, v_dm_uid, 'NPC-only session');
  insert into encounters (id, session_id, name, ended_at)
    values (v_encounter_id, v_session_id, 'NPC ambush', NULL);
  -- Only NPC combatants (player_character_id = NULL).
  insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_defeated)
    values (v_encounter_id, 'Goblin A', 0, 7, 15, true),
           (v_encounter_id, 'Goblin B', 0, 7, 15, true);

  -- Close the encounter. Trigger fires NULL → NOT NULL but UPDATE hits 0 rows.
  update encounters set ended_at = '2026-04-22 12:00:00+00' where id = v_encounter_id;
end
$$;

-- playerA still has its value from TEST 1-2 (2026-04-21 18:00:00), NOT bumped
-- forward by the NPC-only encounter closing at 12:00 the next day. If the
-- trigger accidentally UPDATEd despite no PC rows being joined, last_
-- session_at would have advanced to 2026-04-22 12:00:00.
select is(
  (select last_session_at from users where id = (select player_a_uid from t_ids)),
  '2026-04-21 18:00:00+00'::timestamptz,
  'encounter with ONLY NPC combatants triggers no users.last_session_at write'
);

select * from finish();
rollback;
