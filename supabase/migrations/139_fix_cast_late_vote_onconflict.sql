-- 139: HOTFIX — cast_late_vote_via_token ON CONFLICT partial index match
--
-- Bug discovered 2026-04-17 during beta 3 voting dispatch to DM Lucas's group:
-- All POST /api/feedback calls returned 500 "server_error" because the RPC
-- `cast_late_vote_via_token` threw PostgreSQL error 42P10:
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
--
-- Root cause: the partial unique index
--   CREATE UNIQUE INDEX encounter_votes_token_unique
--   ON encounter_votes(encounter_id, session_token_id, voter_fingerprint)
--   WHERE session_token_id IS NOT NULL;
-- requires the predicate `WHERE session_token_id IS NOT NULL` to be repeated
-- in the ON CONFLICT clause for the arbiter inference to succeed (per
-- PostgreSQL docs on ON CONFLICT with partial unique indexes).
--
-- Fix: redefine the function with `ON CONFLICT (...) WHERE session_token_id
-- IS NOT NULL DO UPDATE SET ...`
--
-- Idempotent: CREATE OR REPLACE FUNCTION is inherently idempotent.
-- Reversible: re-run migration 138 to restore the (broken) version.

CREATE OR REPLACE FUNCTION cast_late_vote_via_token(
  p_token TEXT,
  p_encounter_id UUID,
  p_vote SMALLINT,
  p_voter_fingerprint UUID
) RETURNS JSONB AS $$
DECLARE
  v_token_id UUID;
  v_session_id UUID;
  v_ev_avg NUMERIC;
  v_ev_count INTEGER;
  v_existing_count INTEGER;
  v_final_avg NUMERIC(2,1);
  v_final_count INTEGER;
  v_rate_ok BOOLEAN;
BEGIN
  -- Validate voter_fingerprint shape
  IF p_voter_fingerprint IS NULL THEN
    RAISE EXCEPTION 'voter_fingerprint is required';
  END IF;

  -- Validate token
  SELECT id, session_id INTO v_token_id, v_session_id
  FROM session_tokens
  WHERE token = p_token AND is_active = true;

  IF v_token_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive session token';
  END IF;

  -- Internal rate limit (defense-in-depth vs direct anon-key RPC call).
  -- Scoped per (token, voter_fingerprint) to prevent spam per player.
  BEGIN
    v_rate_ok := check_rate_limit(
      'feedback_rpc:' || p_token || ':' || p_voter_fingerprint::text,
      5,        -- max 5 calls
      60        -- per 60 seconds
    );
    IF NOT v_rate_ok THEN
      RAISE EXCEPTION 'Rate limit exceeded for this voter on this session';
    END IF;
  EXCEPTION
    WHEN undefined_function THEN
      -- check_rate_limit not present in local dev; skip gracefully.
      NULL;
  END;

  -- Validate encounter belongs to the token's session
  IF NOT EXISTS (
    SELECT 1 FROM encounters
    WHERE id = p_encounter_id AND session_id = v_session_id
  ) THEN
    RAISE EXCEPTION 'Encounter does not belong to this session';
  END IF;

  -- Upsert via partial unique index on (encounter_id, session_token_id, voter_fingerprint)
  -- WHERE session_token_id IS NOT NULL. Predicate MUST be repeated in ON CONFLICT
  -- to match the partial index (PG 42P10 otherwise).
  INSERT INTO encounter_votes (encounter_id, session_token_id, voter_fingerprint, vote)
  VALUES (p_encounter_id, v_token_id, p_voter_fingerprint, p_vote)
  ON CONFLICT (encounter_id, session_token_id, voter_fingerprint)
    WHERE session_token_id IS NOT NULL
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

-- Re-grant (safe — idempotent)
REVOKE EXECUTE ON FUNCTION cast_late_vote_via_token FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cast_late_vote_via_token TO anon, authenticated;

COMMENT ON FUNCTION cast_late_vote_via_token IS
  'HOTFIX 139: Cast or update retroactive difficulty vote via session token. '
  'Requires voter_fingerprint UUID for per-player discrimination. Internal '
  'rate limit 5/60s per (token, fingerprint). Partial unique index match '
  'restored (ON CONFLICT ... WHERE session_token_id IS NOT NULL).';
