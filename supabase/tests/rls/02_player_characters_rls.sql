-- 02_player_characters_rls.sql
-- RLS tests for `player_characters` — specifically the "users read own"
-- policy from migration 027:
--
--   CREATE POLICY "Users can read own characters"
--     ON player_characters FOR SELECT
--     USING (auth.uid() = user_id);
--
-- Scenario: Alice owns a character hard-linked to her user_id. Bob should
-- NOT see it. Alice should.
--
-- Bonus: we also check that a NULL user_id (DM-pre-created character with
-- no player yet) is invisible to both Alice and Bob — only the
-- `player_characters_owner_select` policy (DM of the campaign) returns it,
-- which is tested elsewhere.

begin;
select plan(3);

select helpers.test_clear_auth();
set local role postgres;

-- Seed personas (idempotent; helpers.test_setup_user handles re-use).
select helpers.test_setup_user('alice@example.com');
select helpers.test_setup_user('bob@example.com');

create temp table t_ids (
  alice_uid uuid,
  bob_uid uuid,
  campaign_id uuid default gen_random_uuid(),
  alice_char_id uuid default gen_random_uuid(),
  orphan_char_id uuid default gen_random_uuid()
);
insert into t_ids (alice_uid, bob_uid) values (
  (select id from auth.users where email = 'alice@example.com'),
  (select id from auth.users where email = 'bob@example.com')
);

-- Seed a campaign owned by Alice.
insert into campaigns (id, owner_id, name)
select campaign_id, alice_uid, 'Alice Campaign' from t_ids;

-- Seed two characters:
--   (a) alice_char: hard claim (user_id = Alice). Only Alice's "read own"
--       policy should match.
--   (b) orphan_char: user_id NULL, no soft claim. Only DM can see it.
insert into player_characters (id, campaign_id, name, max_hp, current_hp, ac, user_id)
select alice_char_id, campaign_id, 'Alice the Ranger', 30, 30, 14, alice_uid
  from t_ids;

insert into player_characters (id, campaign_id, name, max_hp, current_hp, ac, user_id)
select orphan_char_id, campaign_id, 'Orphan Pre-Gen', 25, 25, 13, null
  from t_ids;

-- ---------------------------------------------------------------------------
-- TEST 1: Alice sees her own character.
-- ---------------------------------------------------------------------------
select helpers.test_setup_user('alice@example.com');

select is(
  (select count(*)::int from player_characters
     where id = (select alice_char_id from t_ids)),
  1,
  'Alice sees her own hard-claimed character (users_read_own policy matches)'
);

-- ---------------------------------------------------------------------------
-- TEST 2: Bob does NOT see Alice's character.
-- Bob is not Alice, not the DM of the campaign, not a member — every
-- available SELECT policy fails → zero rows.
-- ---------------------------------------------------------------------------
select helpers.test_setup_user('bob@example.com');

select is_empty(
  $$select 1 from player_characters
     where name = 'Alice the Ranger'$$,
  'Bob (not-owner, not-DM, not-member) cannot SELECT Alice character'
);

-- ---------------------------------------------------------------------------
-- TEST 3: Alice (as DM of the campaign) can see the orphan character via the
-- `player_characters_owner_select` policy (migration 005), not the "read
-- own" policy (orphan.user_id is NULL).
-- ---------------------------------------------------------------------------
select helpers.test_setup_user('alice@example.com');

select is(
  (select count(*)::int from player_characters
     where id = (select orphan_char_id from t_ids)),
  1,
  'Alice (DM of campaign) sees orphan pre-gen via owner_select policy'
);

select * from finish();
rollback;
