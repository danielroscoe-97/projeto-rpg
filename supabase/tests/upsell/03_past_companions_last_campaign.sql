-- 03_past_companions_last_campaign.sql
-- Epic 04 (Player-as-DM Upsell), Story 04-A4 — Test 3 / F3.
--
-- F3 claim: get_past_companions() returns each companion with the
-- last_campaign_name corresponding to the MOST-RECENTLY-TOUCHED shared
-- session with THAT companion — which may differ across companions.
--
-- Scenario (patched in Sprint-1-corrective / H8)
-- ──────────────────────────────────────────────
-- The earlier version gave X and Y exactly one session each, so the
-- DISTINCT ON pick was trivially correct regardless of the correlated-
-- subquery bug we intended to pin down. A buggy "global max across ALL
-- my sessions" variant would pass the same test.
--
-- To actually exercise F3 we need at least one companion that shares
-- MULTIPLE sessions (in different campaigns, with different timestamps)
-- AND another companion whose session is globally newer than any of
-- the first companion's sessions.
--
-- User A played:
--   Session 1 — Campaign One   (t = -7 days)   with companion X
--   Session 2 — Campaign Three (t = -5 days)   with companion X  (X's NEWEST)
--   Session 3 — Campaign Two   (t = -1 day)    with companion Y  (globally newest)
--
-- Expected:
--   X → last_campaign_name = 'Campaign Three'
--   Y → last_campaign_name = 'Campaign Two'
--
-- Buggy behaviour (pre-CTE correlated subquery): X would resolve to
-- 'Campaign Two' because it's the globally most-recent shared session,
-- not X's most-recent. This scenario catches that regression.

begin;
select plan(5);

select helpers.test_clear_auth();
set local role postgres;

select helpers.test_setup_user('f3-user-a@example.com');
select helpers.test_setup_user('f3-companion-x@example.com');
select helpers.test_setup_user('f3-companion-y@example.com');
select helpers.test_setup_user('f3-dm@example.com');
select helpers.test_clear_auth();
set local role postgres;

create temp table t_ids (
  user_a_uid   uuid,
  comp_x_uid   uuid,
  comp_y_uid   uuid,
  dm_uid       uuid,
  camp_1_id    uuid default gen_random_uuid(), -- Campaign One   (X: old)
  camp_2_id    uuid default gen_random_uuid(), -- Campaign Two   (Y: newest globally)
  camp_3_id    uuid default gen_random_uuid(), -- Campaign Three (X: newest for X)
  session_1_id uuid default gen_random_uuid(),
  session_2_id uuid default gen_random_uuid(),
  session_3_id uuid default gen_random_uuid(),
  enc_1_id     uuid default gen_random_uuid(),
  enc_2_id     uuid default gen_random_uuid(),
  enc_3_id     uuid default gen_random_uuid(),
  pc_a_c1_id   uuid default gen_random_uuid(),
  pc_a_c2_id   uuid default gen_random_uuid(),
  pc_a_c3_id   uuid default gen_random_uuid(),
  pc_x_c1_id   uuid default gen_random_uuid(),
  pc_x_c3_id   uuid default gen_random_uuid(),
  pc_y_id      uuid default gen_random_uuid()
);
insert into t_ids (user_a_uid, comp_x_uid, comp_y_uid, dm_uid) values (
  (select id from auth.users where email = 'f3-user-a@example.com'),
  (select id from auth.users where email = 'f3-companion-x@example.com'),
  (select id from auth.users where email = 'f3-companion-y@example.com'),
  (select id from auth.users where email = 'f3-dm@example.com')
);

update public.users set display_name = 'Companion X'
 where id = (select comp_x_uid from t_ids);
update public.users set display_name = 'Companion Y'
 where id = (select comp_y_uid from t_ids);

-- Three campaigns.
insert into campaigns (id, owner_id, name) values
  ((select camp_1_id from t_ids), (select dm_uid from t_ids), 'Campaign One'),
  ((select camp_2_id from t_ids), (select dm_uid from t_ids), 'Campaign Two'),
  ((select camp_3_id from t_ids), (select dm_uid from t_ids), 'Campaign Three');

-- Player characters.
insert into player_characters (id, campaign_id, name, max_hp, current_hp, ac, user_id) values
  ((select pc_a_c1_id from t_ids), (select camp_1_id from t_ids), 'A in C1', 30, 30, 14, (select user_a_uid from t_ids)),
  ((select pc_a_c2_id from t_ids), (select camp_2_id from t_ids), 'A in C2', 30, 30, 14, (select user_a_uid from t_ids)),
  ((select pc_a_c3_id from t_ids), (select camp_3_id from t_ids), 'A in C3', 30, 30, 14, (select user_a_uid from t_ids)),
  ((select pc_x_c1_id from t_ids), (select camp_1_id from t_ids), 'X in C1', 28, 28, 13, (select comp_x_uid from t_ids)),
  ((select pc_x_c3_id from t_ids), (select camp_3_id from t_ids), 'X in C3', 28, 28, 13, (select comp_x_uid from t_ids)),
  ((select pc_y_id    from t_ids), (select camp_2_id from t_ids), 'Y in C2', 28, 28, 13, (select comp_y_uid from t_ids));

-- Sessions with explicit updated_at so the ORDER BY is deterministic.
-- X shares S1 (C1, -7d) and S2 (C3, -5d). Y shares S3 (C2, -1d, globally newest).
insert into sessions (id, campaign_id, owner_id, name, updated_at) values
  ((select session_1_id from t_ids), (select camp_1_id from t_ids), (select dm_uid from t_ids), 'Session 1', now() - interval '7 days'),
  ((select session_2_id from t_ids), (select camp_3_id from t_ids), (select dm_uid from t_ids), 'Session 2', now() - interval '5 days'),
  ((select session_3_id from t_ids), (select camp_2_id from t_ids), (select dm_uid from t_ids), 'Session 3', now() - interval '1 day');

insert into encounters (id, session_id, name) values
  ((select enc_1_id from t_ids), (select session_1_id from t_ids), 'Encounter C1'),
  ((select enc_2_id from t_ids), (select session_2_id from t_ids), 'Encounter C3'),
  ((select enc_3_id from t_ids), (select session_3_id from t_ids), 'Encounter C2');

-- S1: A + X. S2: A + X. S3: A + Y.
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_player, player_character_id) values
  ((select enc_1_id from t_ids), 'A(C1)', 30, 30, 14, true, (select pc_a_c1_id from t_ids)),
  ((select enc_1_id from t_ids), 'X(C1)', 28, 28, 13, true, (select pc_x_c1_id from t_ids)),
  ((select enc_2_id from t_ids), 'A(C3)', 30, 30, 14, true, (select pc_a_c3_id from t_ids)),
  ((select enc_2_id from t_ids), 'X(C3)', 28, 28, 13, true, (select pc_x_c3_id from t_ids)),
  ((select enc_3_id from t_ids), 'A(C2)', 30, 30, 14, true, (select pc_a_c2_id from t_ids)),
  ((select enc_3_id from t_ids), 'Y(C2)', 28, 28, 13, true, (select pc_y_id    from t_ids));

-- A defeated combatant per session so the matview's "combat happened"
-- proxy is satisfied too (future-proofing if F3 ever gates on it).
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_defeated) values
  ((select enc_1_id from t_ids), 'Goblin', 0, 7,  15, true),
  ((select enc_2_id from t_ids), 'Goblin', 0, 7,  15, true),
  ((select enc_3_id from t_ids), 'Orc',    0, 15, 13, true);

select helpers.test_setup_user('f3-user-a@example.com');

-- ---------------------------------------------------------------------------
-- TEST 1 (H8 core): X has two shared sessions; last_campaign_name must be
-- the NEWER of X's own sessions (Campaign Three), NOT the globally newest
-- shared session (Campaign Two, which belongs to companion Y).
-- ---------------------------------------------------------------------------
select is(
  (select last_campaign_name from get_past_companions()
     where companion_user_id = (select comp_x_uid from t_ids)),
  'Campaign Three',
  'F3 (H8 fix): X''s last_campaign_name is X''s MOST-RECENT shared campaign, not the globally newest'
);

-- ---------------------------------------------------------------------------
-- TEST 2: Y's only shared session resolves to Campaign Two.
-- ---------------------------------------------------------------------------
select is(
  (select last_campaign_name from get_past_companions()
     where companion_user_id = (select comp_y_uid from t_ids)),
  'Campaign Two',
  'F3: Y''s last_campaign_name resolves to their only shared campaign'
);

-- ---------------------------------------------------------------------------
-- TEST 3: X and Y end up with DIFFERENT last_campaign_name values — the
-- regression guard proper. A bug that collapses both to the global max
-- would cause X and Y to share the value.
-- ---------------------------------------------------------------------------
select isnt(
  (select last_campaign_name from get_past_companions()
     where companion_user_id = (select comp_x_uid from t_ids)),
  (select last_campaign_name from get_past_companions()
     where companion_user_id = (select comp_y_uid from t_ids)),
  'F3: X and Y resolve to DIFFERENT last_campaign_name values (per-companion correlation)'
);

-- ---------------------------------------------------------------------------
-- TEST 4 (M5 tiebreaker): force X's two sessions to have IDENTICAL
-- session_updated_at and assert get_past_companions still returns a
-- DETERMINISTIC last_campaign_name across runs (migration 172 added
-- campaign_id ASC as the tiebreaker to DISTINCT ON).
-- ---------------------------------------------------------------------------
-- Upgrade superuser to update session timestamps directly, then bounce
-- back into user_a to re-query.
set local role postgres;
select helpers.test_clear_auth();

update sessions
   set updated_at = '2026-04-20 12:00:00+00'
 where id in (
   (select session_1_id from t_ids),
   (select session_2_id from t_ids)
 );

select helpers.test_setup_user('f3-user-a@example.com');

-- Campaign One UUID is lexicographically smaller than Campaign Three's
-- if and only if camp_1_id < camp_3_id as UUIDs. That's random per
-- run, so we assert against whichever is smaller instead of a fixed
-- name — the test's job is to verify DETERMINISM, not to pin a
-- particular campaign.
select is(
  (select last_campaign_name from get_past_companions()
     where companion_user_id = (select comp_x_uid from t_ids)),
  (select c.name from campaigns c
     where c.id = (
       select least(
         (select camp_1_id from t_ids),
         (select camp_3_id from t_ids)
       )
     )),
  'M5: DISTINCT ON tiebreaker on identical session_updated_at resolves to lexicographically-smaller campaign_id'
);

-- ---------------------------------------------------------------------------
-- TEST 5 (M5 stability): a second call to get_past_companions() with the
-- same tied state must return the same last_campaign_name for X.
-- ---------------------------------------------------------------------------
select is(
  (select last_campaign_name from get_past_companions()
     where companion_user_id = (select comp_x_uid from t_ids)),
  (select last_campaign_name from get_past_companions()
     where companion_user_id = (select comp_x_uid from t_ids)),
  'M5: repeated calls with tied timestamps return the same campaign_name (stable tiebreak)'
);

select * from finish();
rollback;
