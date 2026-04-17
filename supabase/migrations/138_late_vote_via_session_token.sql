-- 138: Retroactive Difficulty Voting via Session Token
-- Enables anonymous players (from /join/[token]) to cast difficulty votes
-- retroactively via a standalone `/feedback/[token]` page.
--
-- Beta test 3 (2026-04-16) context: players missed the in-session poll because
-- the recap broadcast was lost. This migration enables a shareable link
-- (e.g. WhatsApp) that accepts anon votes tied to the session_token.
--
-- Design:
--   - Original `cast_late_vote(encounter_id, vote)` is UNCHANGED (auth-only).
--   - Adds sibling `cast_late_vote_via_token(token, encounter_id, vote,
--     voter_fingerprint)` that is SECURITY DEFINER and accessible to `anon`.
--   - Adds `session_token_id` + `voter_fingerprint` columns to
--     `encounter_votes` so each player on a shared link gets their own vote
--     row (prevents "last vote overwrites all previous" bug when DM shares
--     one link with N players).
--   - Adds `encounter_feedback_notes` table to persist optional textarea
--     comments (best-effort insert; does not block the vote upsert).
--   - Uses existing `check_rate_limit` RPC (migration 016) to enforce a
--     per-(token, voter_fingerprint) cap inside the RPC as defense-in-depth
--     against direct-to-Supabase anon key abuse that bypasses the Next route.
--
-- Idempotent: all operations use IF [NOT] EXISTS / DO $$ BEGIN / EXCEPTION
-- blocks so the migration can be re-run safely.
--
-- NOTE on migration numbering: originally filed as 136, renumbered to 138
-- during code review because Track A (recap snapshot) kept 136 and Track C
-- (whitelist backfill) moved to 137. See docs/code-review-track-f.md.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Schema: add session_token_id + voter_fingerprint, swap unique indexes
-- ---------------------------------------------------------------------------

ALTER TABLE encounter_votes
  ADD COLUMN IF NOT EXISTS session_token_id UUID
    REFERENCES session_tokens(id) ON DELETE SET NULL;

ALTER TABLE encounter_votes
  ADD COLUMN IF NOT EXISTS voter_fingerprint UUID NULL;

-- user_id was NOT NULL originally — relax it so anon voters are legal rows.
DO $$
BEGIN
  ALTER TABLE encounter_votes ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN
  -- Column missing outright; nothing to relax.
  NULL;
WHEN OTHERS THEN
  -- Already nullable; ignore.
  NULL;
END $$;

-- Create partial uniques BEFORE dropping the old composite unique, to avoid
-- a window where no unique exists on (encounter_id, user_id). Postgres
-- tolerates both coexisting briefly: the old unique is on the full
-- composite, the new partial is gated on user_id IS NOT NULL.
CREATE UNIQUE INDEX IF NOT EXISTS encounter_votes_user_unique
  ON encounter_votes(encounter_id, user_id)
  WHERE user_id IS NOT NULL;

-- Token-based partial unique now includes voter_fingerprint as a
-- discriminator, so N players sharing a single /feedback/<token> link each
-- get their own row (one vote per fingerprint).
-- Drop a pre-existing (token-only) partial if it exists so we can recreate
-- with the fingerprint dimension.
DROP INDEX IF EXISTS encounter_votes_token_unique;

CREATE UNIQUE INDEX IF NOT EXISTS encounter_votes_token_unique
  ON encounter_votes(encounter_id, session_token_id, voter_fingerprint)
  WHERE session_token_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_encounter_votes_session_token
  ON encounter_votes(session_token_id)
  WHERE session_token_id IS NOT NULL;

-- Now it's safe to drop the old composite unique.
ALTER TABLE encounter_votes
  DROP CONSTRAINT IF EXISTS encounter_votes_encounter_id_user_id_key;
DROP INDEX IF EXISTS encounter_votes_encounter_id_user_id_key;

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
-- 2. Notes table: persist optional textarea comments (best-effort)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS encounter_feedback_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  session_token_id UUID REFERENCES session_tokens(id) ON DELETE SET NULL,
  voter_fingerprint UUID,
  notes TEXT NOT NULL CHECK (char_length(notes) <= 280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_encounter_feedback_notes_encounter
  ON encounter_feedback_notes(encounter_id);

ALTER TABLE encounter_feedback_notes ENABLE ROW LEVEL SECURITY;

-- Only service_role reads/writes via the API route.
DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON encounter_feedback_notes FROM PUBLIC, anon, authenticated';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

COMMENT ON TABLE encounter_feedback_notes IS
  'Optional comments accompanying retroactive difficulty votes cast via /feedback/[token]. Service-role only — sanitized server-side before insert.';

-- ---------------------------------------------------------------------------
-- 3. RPC: cast_late_vote_via_token (anon-accessible, fingerprint-aware)
-- ---------------------------------------------------------------------------
-- Validates token, verifies encounter belongs to the session, upserts the
-- vote keyed on (encounter_id, session_token_id, voter_fingerprint), and
-- recalculates encounter difficulty aggregate. Also enforces a per-
-- (token, fingerprint) rate limit via existing check_rate_limit RPC
-- (5 calls / 60s) as defense-in-depth against direct-RPC abuse by clients
-- that have the anon key and bypass the Next route.

DROP FUNCTION IF EXISTS cast_late_vote_via_token(TEXT, UUID, SMALLINT);

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
  IF p_vote IS NULL OR p_vote < 1 OR p_vote > 5 THEN
    RAISE EXCEPTION 'Vote must be between 1 and 5';
  END IF;

  IF p_voter_fingerprint IS NULL THEN
    RAISE EXCEPTION 'voter_fingerprint required';
  END IF;

  -- Server-side rate limit: 5 calls per 60s per (token, fingerprint).
  -- Mitigates direct-RPC abuse (Supabase anon key is public).
  SELECT check_rate_limit(
    'feedback_rpc:' || p_token || ':' || p_voter_fingerprint::text,
    5,
    60
  ) INTO v_rate_ok;

  IF NOT v_rate_ok THEN
    RAISE EXCEPTION 'Rate limit exceeded';
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

  -- Upsert via partial unique index on (encounter_id, session_token_id, voter_fingerprint).
  INSERT INTO encounter_votes (encounter_id, session_token_id, voter_fingerprint, vote)
  VALUES (p_encounter_id, v_token_id, p_voter_fingerprint, p_vote)
  ON CONFLICT (encounter_id, session_token_id, voter_fingerprint)
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
REVOKE EXECUTE ON FUNCTION cast_late_vote_via_token(TEXT, UUID, SMALLINT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cast_late_vote_via_token(TEXT, UUID, SMALLINT, UUID)
  TO anon, authenticated;

COMMENT ON FUNCTION cast_late_vote_via_token IS
  'Cast a retroactive difficulty vote via session_token + voter_fingerprint (anon players). Paired with cast_late_vote for authenticated players. See docs/spec-feedback-retroactive-voting.md.';

COMMENT ON COLUMN encounter_votes.session_token_id IS
  'Set when an anonymous player votes retroactively via /feedback/[token]. Mutually exclusive with user_id at the row level. Unique with voter_fingerprint per encounter — multiple players sharing one link each get their own row.';

COMMENT ON COLUMN encounter_votes.voter_fingerprint IS
  'Client-generated UUID persisted in localStorage per browser. Discriminates multiple anon voters sharing the same session_token (e.g. DM shares one feedback link with 6 players).';

COMMIT;

-- ---------------------------------------------------------------------------
-- RESIDUAL RISK (documented)
-- ---------------------------------------------------------------------------
-- A malicious client with the public anon key can call this RPC directly
-- and bypass the Next route's rate limit. The in-RPC check_rate_limit above
-- is keyed on (token, voter_fingerprint), so an attacker can still spam by
-- rotating fingerprints per token — but doing so still requires knowing a
-- valid, active session_tokens.token (random 16+ chars). Full mitigation
-- requires a service-role gateway or a Cloudflare WAF in front of Supabase;
-- deferred to v2. For beta, the combination of random token + per-
-- fingerprint RPC limit + Next-route rate limit (per-token) is acceptable.
