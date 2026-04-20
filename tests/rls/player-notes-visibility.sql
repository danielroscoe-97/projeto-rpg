-- ============================================================================
-- RLS contract tests — Player <-> DM Notes Visibility (Migration 149)
-- Spec: docs/SPEC-player-notes-visibility.md §6.1
--
-- Run after `rtk supabase db reset` (fresh local DB with all migrations applied).
-- Each scenario uses `SET LOCAL ROLE authenticated` + `SET LOCAL "request.jwt.claims"`
-- to impersonate distinct users, mirroring how Supabase evaluates RLS in prod.
--
-- Success criteria: EVERY `EXPECT_ROWS(n)` line must match, no exceptions.
-- A single mismatch in scenarios 4, 5, 6, 8, 9 = security leak (merge blocker).
--
-- NOTE: this file is designed to be sourced from `psql`. It uses RAISE NOTICE
-- to report pass/fail so it can also be wrapped by `scripts/audit-rls.ts` or
-- a CI hook later (see TODO block at bottom).
-- ============================================================================

BEGIN;

-- Prevent any committed side-effects even if something goes wrong.
SET LOCAL idle_in_transaction_session_timeout = '30s';

-- -------------------------------------------------------------------------
-- 1. Seed data
-- -------------------------------------------------------------------------
-- Three fake users: dm_a (owner of campaign_a), player_1 (owns pc_1 in camp_a),
-- player_2 (owns pc_2 in camp_a), dm_b (owner of campaign_b, unrelated).
DO $$
DECLARE
  dm_a_id         UUID := '00000000-0000-0000-0000-000000000a01';
  dm_b_id         UUID := '00000000-0000-0000-0000-000000000b01';
  player_1_id     UUID := '00000000-0000-0000-0000-000000000101';
  player_2_id     UUID := '00000000-0000-0000-0000-000000000102';
  camp_a_id       UUID := '00000000-0000-0000-0000-0000000000a1';
  camp_b_id       UUID := '00000000-0000-0000-0000-0000000000b1';
  pc_1_id         UUID := '00000000-0000-0000-0000-000000000011';
  pc_2_id         UUID := '00000000-0000-0000-0000-000000000012';
  journal_priv_id UUID := '00000000-0000-0000-0000-000000000201';
  journal_shar_id UUID := '00000000-0000-0000-0000-000000000202';
  note_dm_priv_id UUID := '00000000-0000-0000-0000-000000000301';
BEGIN
  -- Users (auth.users is readonly; assume they exist via prior fixture).
  -- If auth.users rows don't exist yet, insert minimal stubs (Supabase dev-only).
  INSERT INTO auth.users (id, email) VALUES
    (dm_a_id, 'dm_a@test.local'),
    (dm_b_id, 'dm_b@test.local'),
    (player_1_id, 'player_1@test.local'),
    (player_2_id, 'player_2@test.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.users (id, display_name)
  VALUES
    (dm_a_id, 'DM A'),
    (dm_b_id, 'DM B'),
    (player_1_id, 'Player One'),
    (player_2_id, 'Player Two')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO campaigns (id, owner_id, name)
  VALUES
    (camp_a_id, dm_a_id, 'Campaign A'),
    (camp_b_id, dm_b_id, 'Campaign B')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO campaign_members (campaign_id, user_id, role, status) VALUES
    (camp_a_id, dm_a_id, 'dm', 'active'),
    (camp_a_id, player_1_id, 'player', 'active'),
    (camp_a_id, player_2_id, 'player', 'active'),
    (camp_b_id, dm_b_id, 'dm', 'active')
  ON CONFLICT (campaign_id, user_id) DO NOTHING;

  INSERT INTO player_characters (id, user_id, campaign_id, name)
  VALUES
    (pc_1_id, player_1_id, camp_a_id, 'Pc One'),
    (pc_2_id, player_2_id, camp_a_id, 'Pc Two')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO player_journal_entries (id, player_character_id, campaign_id, type, content, visibility)
  VALUES
    (journal_priv_id, pc_1_id, camp_a_id, 'quick_note', 'private thought', 'private'),
    (journal_shar_id, pc_1_id, camp_a_id, 'journal', 'shared thought',  'shared_with_dm')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO campaign_notes (id, campaign_id, user_id, title, content, visibility, target_character_id)
  VALUES
    (note_dm_priv_id, camp_a_id, dm_a_id, 'Secret tip', 'for player 1', 'dm_private_to_player', pc_1_id)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Helper: switch role to a given user_id for the current transaction.
-- Uses Supabase's standard RLS impersonation pattern.
CREATE OR REPLACE FUNCTION pg_temp.as_user(p_user_id UUID) RETURNS void AS $$
BEGIN
  EXECUTE format('SET LOCAL ROLE authenticated');
  EXECUTE format(
    'SET LOCAL "request.jwt.claims" TO %L',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.assert_rows(
  p_label TEXT, p_query TEXT, p_expected INTEGER
) RETURNS void AS $$
DECLARE
  actual INTEGER;
BEGIN
  EXECUTE 'SELECT COUNT(*) FROM (' || p_query || ') s' INTO actual;
  IF actual = p_expected THEN
    RAISE NOTICE 'PASS %: got % rows (expected %)', p_label, actual, p_expected;
  ELSE
    RAISE EXCEPTION 'FAIL %: got % rows (expected %)', p_label, actual, p_expected;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------------------
-- SCENARIOS
-- -------------------------------------------------------------------------

-- 1. Author reads own `private` note -> 1 row.
PERFORM pg_temp.as_user('00000000-0000-0000-0000-000000000101'::UUID);
PERFORM pg_temp.assert_rows(
  'S1 author sees own private',
  $q$ SELECT 1 FROM player_journal_entries WHERE id = '00000000-0000-0000-0000-000000000201' $q$,
  1
);

-- 2. Author reads own `shared_with_dm` note -> 1 row.
PERFORM pg_temp.as_user('00000000-0000-0000-0000-000000000101'::UUID);
PERFORM pg_temp.assert_rows(
  'S2 author sees own shared',
  $q$ SELECT 1 FROM player_journal_entries WHERE id = '00000000-0000-0000-0000-000000000202' $q$,
  1
);

-- 3. DM of the campaign reads `shared_with_dm` entry -> 1 row.
PERFORM pg_temp.as_user('00000000-0000-0000-0000-000000000a01'::UUID);
PERFORM pg_temp.assert_rows(
  'S3 DM sees player shared',
  $q$ SELECT 1 FROM player_journal_entries WHERE id = '00000000-0000-0000-0000-000000000202' $q$,
  1
);

-- 4. DM of the campaign tries to read `private` entry -> 0 rows (CRITICAL).
PERFORM pg_temp.as_user('00000000-0000-0000-0000-000000000a01'::UUID);
PERFORM pg_temp.assert_rows(
  'S4 DM CANNOT see player private (LEAK = FAIL)',
  $q$ SELECT 1 FROM player_journal_entries WHERE id = '00000000-0000-0000-0000-000000000201' $q$,
  0
);

-- 5. Another player in same campaign tries to read `shared_with_dm` -> 0 rows.
PERFORM pg_temp.as_user('00000000-0000-0000-0000-000000000102'::UUID);
PERFORM pg_temp.assert_rows(
  'S5 peer player CANNOT see shared',
  $q$ SELECT 1 FROM player_journal_entries WHERE id = '00000000-0000-0000-0000-000000000202' $q$,
  0
);

-- 6. DM of another campaign tries to read `shared_with_dm` -> 0 rows.
PERFORM pg_temp.as_user('00000000-0000-0000-0000-000000000b01'::UUID);
PERFORM pg_temp.assert_rows(
  'S6 foreign DM CANNOT see shared',
  $q$ SELECT 1 FROM player_journal_entries WHERE id = '00000000-0000-0000-0000-000000000202' $q$,
  0
);

-- 7. Targeted player reads DM-private note addressed to them -> 1 row.
PERFORM pg_temp.as_user('00000000-0000-0000-0000-000000000101'::UUID);
PERFORM pg_temp.assert_rows(
  'S7 target player sees DM private',
  $q$ SELECT 1 FROM campaign_notes WHERE id = '00000000-0000-0000-0000-000000000301' $q$,
  1
);

-- 8. Peer player in same campaign tries to read DM-private note -> 0 rows.
PERFORM pg_temp.as_user('00000000-0000-0000-0000-000000000102'::UUID);
PERFORM pg_temp.assert_rows(
  'S8 peer CANNOT see DM private to peer',
  $q$ SELECT 1 FROM campaign_notes WHERE id = '00000000-0000-0000-0000-000000000301' $q$,
  0
);

-- 9. Anon (no JWT) tries to read any note -> 0 rows (all policies need auth.uid()).
RESET ROLE;
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" TO '';
PERFORM pg_temp.assert_rows(
  'S9 anon CANNOT see any journal',
  $q$ SELECT 1 FROM player_journal_entries $q$,
  0
);
PERFORM pg_temp.assert_rows(
  'S9b anon CANNOT see any campaign_note',
  $q$ SELECT 1 FROM campaign_notes WHERE visibility = 'dm_private_to_player' $q$,
  0
);

-- 10. Player tries to UPDATE another player's journal -> 0 rows touched.
PERFORM pg_temp.as_user('00000000-0000-0000-0000-000000000102'::UUID);
DO $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE player_journal_entries
     SET content = 'hacked'
   WHERE id = '00000000-0000-0000-0000-000000000201';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected = 0 THEN
    RAISE NOTICE 'PASS S10 peer cannot UPDATE other player journal';
  ELSE
    RAISE EXCEPTION 'FAIL S10 peer UPDATE affected % rows (expected 0)', affected;
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- Bonus: CHECK constraint sanity
-- -------------------------------------------------------------------------
-- INSERT with visibility=dm_private_to_player AND target_character_id=NULL
-- must fail with a CHECK violation.
DO $$
BEGIN
  BEGIN
    INSERT INTO campaign_notes (campaign_id, user_id, title, content, visibility, target_character_id)
    VALUES (
      '00000000-0000-0000-0000-0000000000a1',
      '00000000-0000-0000-0000-000000000a01',
      'bad',
      '',
      'dm_private_to_player',
      NULL
    );
    RAISE EXCEPTION 'FAIL CHECK: insert succeeded when it should have failed';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS CHECK: dm_private_to_player + NULL target rejected';
  END;
END $$;

ROLLBACK;

-- ----------------------------------------------------------------------------
-- TODO (automation integration):
--   To wire this in CI, add the following to scripts/audit-rls.ts (or a new
--   scripts/test-notes-rls.ts):
--     1. Boot local Supabase (`supabase start`).
--     2. Apply migration 149 (`supabase migration up`).
--     3. Pipe this file to `psql $DB_URL -f tests/rls/player-notes-visibility.sql`.
--     4. Fail the step if any line starts with 'FAIL '.
--   Until that hook is added, run manually:
--     psql "$SUPABASE_DB_URL" -f tests/rls/player-notes-visibility.sql
-- ----------------------------------------------------------------------------
