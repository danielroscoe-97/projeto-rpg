-- 136: Retroactive Difficulty Voting via Session Token
-- Enables anonymous players (from /join/[token]) to cast difficulty votes
-- retroactively via a standalone `/feedback/[token]` page.
--
-- Beta test 3 (2026-04-16) context: players missed the in-session poll because
-- the recap broadcast was lost. This migration enables a shareable link
-- (e.g. WhatsApp) that accepts anon votes tied to the session_token.
--
-- Design:
--   - Original `cast_late_vote(encounter_id, vote)` is UNCHANGED (auth-only).
--   - Adds sibling `cast_late_vote_via_token(token, encounter_id, vote)` that
--     is SECURITY DEFINER and accessible to `anon` role.
--   - Adds `session_token_id` column to `encounter_votes` so the "one vote
--     per voter" invariant still holds for anon voters.
--
-- Idempotent: all operations use IF [NOT] EXISTS / DO $$ BEGIN / EXCEPTION
-- blocks so the migration can be re-run safely.

-- ---------------------------------------------------------------------------
-- 1. Schema: add session_token_id, drop old unique, add partial uniques
-- ---------------------------------------------------------------------------

ALTER TABLE encounter_votes
  ADD COLUMN IF NOT EXISTS session_token_id UUID
    REFERENCES session_tokens(id) ON DELETE SET NULL;

-- user_id was NOT NULL originally — relax it so anon voters are legal rows.
DO $$
BEGIN
  ALTER TABLE encounter_votes ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  -- Already nullable; ignore.
  NULL;
END $$;

-- Drop the old composite unique constraint (user_id was NOT NULL, so this
-- constraint is now incompatible with rows where user_id IS NULL).
ALTER TABLE encounter_votes
  DROP CONSTRAINT IF EXISTS encounter_votes_encounter_id_user_id_key;
-- Also drop the backing index if it survived independently of the constraint.
DROP INDEX IF EXISTS encounter_votes_encounter_id_user_id_key;

-- Partial uniques: "one vote per voter per encounter" — by user OR by token.
CREATE UNIQUE INDEX IF NOT EXISTS encounter_votes_user_unique
  ON encounter_votes(encounter_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS encounter_votes_token_unique
  ON encounter_votes(encounter_id, session_token_id)
  WHERE session_token_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_encounter_votes_session_token
  ON encounter_votes(session_token_id)
  WHERE session_token_id IS NOT NULL;

-- Require at least one voter identifier (user or token).
DO $$
BEGIN
  ALTER TABLE encounter_votes
    ADD CONSTRAINT encounter_votes_has_voter
    CHECK (user_id IS NOT NULL OR session_token_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. RPC: cast_late_vote_via_token (anon-accessible)
-- ---------------------------------------------------------------------------
-- Validates token, verifies encounter belongs to the session, upserts the
-- vote, and recalculates encounter difficulty aggregate. Matches the
-- "GREATEST(individual count, existing count)" behaviour of the original
-- `cast_late_vote` so realtime-only votes aren't lost.

CREATE OR REPLACE FUNCTION cast_late_vote_via_token(
  p_token TEXT,
  p_encounter_id UUID,
  p_vote SMALLINT
) RETURNS JSONB AS $$
DECLARE
  v_token_id UUID;
  v_session_id UUID;
  v_ev_avg NUMERIC;
  v_ev_count INTEGER;
  v_existing_count INTEGER;
  v_final_avg NUMERIC(2,1);
  v_final_count INTEGER;
BEGIN
  IF p_vote IS NULL OR p_vote < 1 OR p_vote > 5 THEN
    RAISE EXCEPTION 'Vote must be between 1 and 5';
  END IF;

  -- Validate token and resolve session_id.
  SELECT id, session_id INTO v_token_id, v_session_id
  FROM session_tokens
  WHERE token = p_token AND is_active = true;

  IF v_token_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive session token';
  END IF;

  -- Verify encounter belongs to the token's session.
  IF NOT EXISTS (
    SELECT 1 FROM encounters
    WHERE id = p_encounter_id AND session_id = v_session_id
  ) THEN
    RAISE EXCEPTION 'Encounter does not belong to this session';
  END IF;

  -- Upsert via partial unique index on (encounter_id, session_token_id).
  INSERT INTO encounter_votes (encounter_id, session_token_id, vote)
  VALUES (p_encounter_id, v_token_id, p_vote)
  ON CONFLICT (encounter_id, session_token_id)
  DO UPDATE SET vote = EXCLUDED.vote, voted_at = now();

  -- Recalculate aggregate from encounter_votes (source of truth for individual votes).
  SELECT COALESCE(AVG(vote), 0), COUNT(*) INTO v_ev_avg, v_ev_count
  FROM encounter_votes WHERE encounter_id = p_encounter_id;

  SELECT COALESCE(difficulty_votes, 0) INTO v_existing_count
  FROM encounters WHERE id = p_encounter_id;

  v_final_avg := ROUND(v_ev_avg, 1);
  v_final_count := GREATEST(v_ev_count, v_existing_count);

  UPDATE encounters
  SET difficulty_rating = v_final_avg,
      difficulty_votes = v_final_count
  WHERE id = p_encounter_id;

  RETURN jsonb_build_object('avg', v_final_avg, 'count', v_final_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lock down default privileges, then grant to anon + authenticated.
REVOKE EXECUTE ON FUNCTION cast_late_vote_via_token(TEXT, UUID, SMALLINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cast_late_vote_via_token(TEXT, UUID, SMALLINT)
  TO anon, authenticated;

COMMENT ON FUNCTION cast_late_vote_via_token IS
  'Cast a retroactive difficulty vote via session_token (anon players). Paired with cast_late_vote for authenticated players. See docs/spec-feedback-retroactive-voting.md.';

COMMENT ON COLUMN encounter_votes.session_token_id IS
  'Set when an anonymous player votes retroactively via /feedback/[token]. Mutually exclusive with user_id at the row level (unique per encounter).';
