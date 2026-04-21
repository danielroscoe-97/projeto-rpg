-- 03_past_companions_last_campaign.sql
-- Epic 04 (Player-as-DM Upsell), Story 04-A4 — Test 3 / F3.
--
-- F3 claim: get_past_companions() returns each companion with the
-- last_campaign_name corresponding to the MOST-RECENTLY-TOUCHED shared
-- session for THAT companion — which may differ across companions.
--
-- Test layout:
--   User A played session S1 (campaign C1, older) with companion X.
--   User A played session S2 (campaign C2, newer) with companion Y.
--   X was NOT in S2; Y was NOT in S1.
--
-- Expected:
--   get_past_companions() for user A returns:
--     X → last_campaign_name = 'C1'
--     Y → last_campaign_name = 'C2'
--
-- Pitfall the earlier draft of 169 hit (pre-CTE rewrite): a buggy
-- correlated subquery could pick whatever campaign was most recently
-- updated across ALL of user A's sessions, returning C2 for BOTH companions.
-- This test pins the correct per-companion behaviour.

begin;
select plan(2);

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
  camp_1_id    uuid default gen_random_uuid(),
  camp_2_id    uuid default gen_random_uuid(),
  session_1_id uuid default gen_random_uuid(),
  session_2_id uuid default gen_random_uuid(),
  enc_1_id     uuid default gen_random_uuid(),
  enc_2_id     uuid default gen_random_uuid(),
  pc_a_c1_id   uuid default gen_random_uuid(),
  pc_a_c2_id   uuid default gen_random_uuid(),
  pc_x_id      uuid default gen_random_uuid(),
  pc_y_id      uuid default gen_random_uuid()
);
insert into t_ids (user_a_uid, comp_x_uid, comp_y_uid, dm_uid) values (
  (select id from auth.users where email = 'f3-user-a@example.com'),
  (select id from auth.users where email = 'f3-companion-x@example.com'),
  (select id from auth.users where email = 'f3-companion-y@example.com'),
  (select id from auth.users where email = 'f3-dm@example.com')
);

-- Force display names so the ORDER BY in get_past_companions() is
-- deterministic (its secondary sort is companion_display_name ASC).
update public.users set display_name = 'Companion X'
 where id = (select comp_x_uid from t_ids);
update public.users set display_name = 'Companion Y'
 where id = (select comp_y_uid from t_ids);

-- Campaigns
insert into campaigns (id, owner_id, name) values
  ((select camp_1_id from t_ids), (select dm_uid from t_ids), 'Campaign One'),
  ((select camp_2_id from t_ids), (select dm_uid from t_ids), 'Campaign Two');

-- Player characters (one per user per campaign they played in).
insert into player_characters (id, campaign_id, name, max_hp, current_hp, ac, user_id) values
  ((select pc_a_c1_id from t_ids), (select camp_1_id from t_ids), 'A in C1', 30, 30, 14, (select user_a_uid from t_ids)),
  ((select pc_a_c2_id from t_ids), (select camp_2_id from t_ids), 'A in C2', 30, 30, 14, (select user_a_uid from t_ids)),
  ((select pc_x_id from t_ids),    (select camp_1_id from t_ids), 'X in C1', 28, 28, 13, (select comp_x_uid from t_ids)),
  ((select pc_y_id from t_ids),    (select camp_2_id from t_ids), 'Y in C2', 28, 28, 13, (select comp_y_uid from t_ids));

-- Session 1 in Campaign 1 (older). Set updated_at explicitly so the
-- "most recent shared session per companion" logic is deterministic.
insert into sessions (id, campaign_id, owner_id, name, updated_at) values
  ((select session_1_id from t_ids), (select camp_1_id from t_ids), (select dm_uid from t_ids),
   'Session 1 (old)', now() - interval '7 days');

-- Session 2 in Campaign 2 (newer).
insert into sessions (id, campaign_id, owner_id, name, updated_at) values
  ((select session_2_id from t_ids), (select camp_2_id from t_ids), (select dm_uid from t_ids),
   'Session 2 (new)', now() - interval '1 day');

-- Encounters
insert into encounters (id, session_id, name) values
  ((select enc_1_id from t_ids), (select session_1_id from t_ids), 'Encounter in C1'),
  ((select enc_2_id from t_ids), (select session_2_id from t_ids), 'Encounter in C2');

-- Combatants — S1 contains A + X; S2 contains A + Y.
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_player, player_character_id) values
  ((select enc_1_id from t_ids), 'A(C1)', 30, 30, 14, true, (select pc_a_c1_id from t_ids)),
  ((select enc_1_id from t_ids), 'X',     28, 28, 13, true, (select pc_x_id from t_ids)),
  ((select enc_2_id from t_ids), 'A(C2)', 30, 30, 14, true, (select pc_a_c2_id from t_ids)),
  ((select enc_2_id from t_ids), 'Y',     28, 28, 13, true, (select pc_y_id from t_ids));

-- Defeated combatants for completeness (though get_past_companions itself
-- doesn't gate on is_defeated).
insert into combatants (encounter_id, name, current_hp, max_hp, ac, is_defeated) values
  ((select enc_1_id from t_ids), 'Goblin', 0, 7, 15, true),
  ((select enc_2_id from t_ids), 'Orc',    0, 15, 13, true);

-- ---------------------------------------------------------------------------
-- Impersonate user_a and call get_past_companions().
-- ---------------------------------------------------------------------------
select helpers.test_setup_user('f3-user-a@example.com');

-- ---------------------------------------------------------------------------
-- TEST 1: Companion X → last_campaign_name = 'Campaign One'.
-- ---------------------------------------------------------------------------
select is(
  (select last_campaign_name from get_past_companions()
     where companion_user_id = (select comp_x_uid from t_ids)),
  'Campaign One',
  'F3: Companion X last_campaign_name resolves to Campaign One (their only shared session)'
);

-- ---------------------------------------------------------------------------
-- TEST 2: Companion Y → last_campaign_name = 'Campaign Two'.
-- ---------------------------------------------------------------------------
select is(
  (select last_campaign_name from get_past_companions()
     where companion_user_id = (select comp_y_uid from t_ids)),
  'Campaign Two',
  'F3: Companion Y last_campaign_name resolves to Campaign Two (distinct per companion, not a global max)'
);

select * from finish();
rollback;
