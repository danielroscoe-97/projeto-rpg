-- F-42: Individual encounter votes for late voting + analytics
CREATE TABLE IF NOT EXISTS encounter_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote BETWEEN 1 AND 5),
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(encounter_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_encounter_votes_encounter ON encounter_votes(encounter_id);
CREATE INDEX IF NOT EXISTS idx_encounter_votes_user ON encounter_votes(user_id);

-- RLS: players can read votes for encounters in their campaigns, insert/update/delete their own
ALTER TABLE encounter_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY encounter_votes_select ON encounter_votes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM encounters e
    JOIN sessions s ON s.id = e.session_id
    JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
    WHERE e.id = encounter_votes.encounter_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
  )
);

CREATE POLICY encounter_votes_insert ON encounter_votes FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM encounters e
    JOIN sessions s ON s.id = e.session_id
    JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
    WHERE e.id = encounter_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'player'
      AND cm.status = 'active'
  )
);

-- L2: UPDATE requires ownership + active campaign membership
CREATE POLICY encounter_votes_update ON encounter_votes FOR UPDATE USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM encounters e
    JOIN sessions s ON s.id = e.session_id
    JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
    WHERE e.id = encounter_votes.encounter_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
  )
);

-- L1: DELETE policy for GDPR/vote retraction
CREATE POLICY encounter_votes_delete ON encounter_votes FOR DELETE USING (
  auth.uid() = user_id
);

-- RPC: cast or update a vote, recalculate from encounter_votes as source of truth.
-- The encounters.difficulty_rating/difficulty_votes columns are a CACHE of the
-- encounter_votes aggregate. Realtime votes that were not individually recorded
-- are preserved: we take GREATEST(encounter_votes count, existing encounters count)
-- to avoid losing realtime-only votes.
CREATE OR REPLACE FUNCTION cast_late_vote(
  p_encounter_id UUID,
  p_vote SMALLINT
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_campaign_id UUID;
  v_ev_avg NUMERIC;
  v_ev_count INTEGER;
  v_existing_count INTEGER;
  v_final_avg NUMERIC(2,1);
  v_final_count INTEGER;
BEGIN
  -- Verify user is an active player member of the encounter's campaign
  SELECT c.id INTO v_campaign_id
  FROM encounters e
  JOIN sessions s ON s.id = e.session_id
  JOIN campaigns c ON c.id = s.campaign_id
  JOIN campaign_members cm ON cm.campaign_id = c.id AND cm.user_id = v_user_id
  WHERE e.id = p_encounter_id
    AND cm.role = 'player'
    AND cm.status = 'active';

  IF v_campaign_id IS NULL THEN
    RAISE EXCEPTION 'Not a member of this campaign';
  END IF;

  -- Upsert vote (allows changing vote)
  INSERT INTO encounter_votes (encounter_id, user_id, vote)
  VALUES (p_encounter_id, v_user_id, p_vote)
  ON CONFLICT (encounter_id, user_id) DO UPDATE SET vote = p_vote, voted_at = now();

  -- Recalculate from encounter_votes (source of truth for individual votes)
  SELECT COALESCE(AVG(vote), 0), COUNT(*) INTO v_ev_avg, v_ev_count
  FROM encounter_votes WHERE encounter_id = p_encounter_id;

  -- Get existing aggregate count (may include realtime-only votes not in encounter_votes)
  SELECT COALESCE(difficulty_votes, 0) INTO v_existing_count
  FROM encounters WHERE id = p_encounter_id;

  -- encounter_votes is the sole source for avg; count = max of both to not lose realtime votes
  v_final_avg := ROUND(v_ev_avg, 1);
  v_final_count := GREATEST(v_ev_count, v_existing_count);

  UPDATE encounters
  SET difficulty_rating = v_final_avg, difficulty_votes = v_final_count
  WHERE id = p_encounter_id;

  RETURN jsonb_build_object('avg', v_final_avg, 'count', v_final_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- L4: Restrict RPC execution to authenticated users only
REVOKE EXECUTE ON FUNCTION cast_late_vote FROM anon;
GRANT EXECUTE ON FUNCTION cast_late_vote TO authenticated;

COMMENT ON TABLE encounter_votes IS 'Individual difficulty votes per player per encounter (F-42)';
COMMENT ON FUNCTION cast_late_vote IS 'Cast or update a difficulty vote for a finished encounter — recalculates avg';
