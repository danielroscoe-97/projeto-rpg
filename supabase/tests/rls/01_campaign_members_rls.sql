-- 01_campaign_members_rls.sql
-- RLS tests for `campaign_members` (migrations 033, 035).
--
-- Policy under test (migration 033):
--   campaign_members_select: player only sees campaign_members rows for
--   campaigns where they themselves are an active member.
--
--   campaign_members_dm_all: the campaign owner can see/manage all member
--   rows for their campaigns.
--
-- Shape of the test: two users, two campaigns, cross-checked:
--   - Alice owns campaign A; Alice is auto-added as DM member (via trigger).
--   - Bob owns campaign B. Bob adds Alice as a player member of B.
--   - Assertion 1: Alice (logged in) sees member rows for BOTH A and B.
--   - Assertion 2: Alice does NOT see Carol's membership in campaign C
--     (campaign Alice has no relationship with).
--   - Assertion 3: Bob (logged in) sees Alice in campaign B (DM sees all).

begin;
select plan(4);

-- Seed personas. We call test_setup_user just to CREATE the rows; UUID
-- lookup happens via auth.users table inside the temp table below.
select helpers.test_setup_user('alice@example.com');
select helpers.test_setup_user('bob@example.com');
select helpers.test_setup_user('carol@example.com');

-- Clear auth and elevate to superuser so we can seed fixtures unconstrained
-- by RLS. Everything after this and before the first test_setup_user call
-- runs as postgres.
select helpers.test_clear_auth();
set local role postgres;

-- Store UUIDs in a temp table (temp tables are session-local, RLS-free,
-- auto-dropped at rollback).
create temp table t_personas (name text primary key, uid uuid not null);

insert into t_personas values
  ('alice', (select id from auth.users where email = 'alice@example.com')),
  ('bob',   (select id from auth.users where email = 'bob@example.com')),
  ('carol', (select id from auth.users where email = 'carol@example.com'));

-- Seed campaigns as superuser (bypasses RLS, mimics DM creating a campaign
-- via server action).
insert into campaigns (id, owner_id, name) values
  ('11111111-1111-1111-1111-111111111111', (select uid from t_personas where name='alice'), 'Campaign A'),
  ('22222222-2222-2222-2222-222222222222', (select uid from t_personas where name='bob'),   'Campaign B'),
  ('33333333-3333-3333-3333-333333333333', (select uid from t_personas where name='carol'), 'Campaign C');

-- Manually add memberships to bypass the trigger complexity.
-- (The on_campaign_created trigger already added DM rows for A, B, C.)
insert into campaign_members (campaign_id, user_id, role, status) values
  ('22222222-2222-2222-2222-222222222222', (select uid from t_personas where name='alice'), 'player', 'active')
on conflict (campaign_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- TEST 1: Alice (player) sees her own two memberships across A and B.
-- ---------------------------------------------------------------------------
select helpers.test_setup_user('alice@example.com');

select is(
  (select count(*)::int from campaign_members cm
    where cm.user_id = (select uid from t_personas where name='alice')),
  2,
  'Alice sees her 2 own membership rows (DM of A, player of B)'
);

-- ---------------------------------------------------------------------------
-- TEST 2: Alice CANNOT see Carol's DM row in Campaign C (not a member).
-- ---------------------------------------------------------------------------
select is_empty(
  $$select 1 from campaign_members
     where campaign_id = '33333333-3333-3333-3333-333333333333'$$,
  'Alice sees zero rows for Campaign C (she is not a member)'
);

-- ---------------------------------------------------------------------------
-- TEST 3: Alice CAN see co-members of Campaign B (Bob's DM row).
-- Policy campaign_members_select uses is_campaign_member(campaign_id) which
-- returns true for B → Alice sees Bob's DM row.
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from campaign_members
     where campaign_id = '22222222-2222-2222-2222-222222222222'),
  2,
  'Alice sees 2 members in Campaign B (herself + Bob)'
);

-- ---------------------------------------------------------------------------
-- TEST 4: Bob (DM of B) sees both members of Campaign B.
-- ---------------------------------------------------------------------------
select helpers.test_setup_user('bob@example.com');

select is(
  (select count(*)::int from campaign_members
     where campaign_id = '22222222-2222-2222-2222-222222222222'),
  2,
  'Bob as DM of Campaign B sees 2 members'
);

select * from finish();
rollback;
