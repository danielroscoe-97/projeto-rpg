-- ============================================================
-- 098: Spell Tier Votes — change from under/correct/over to S/A/B/C/D/E
-- ============================================================

-- 1. Drop old constraint, add new one
ALTER TABLE spell_tier_votes DROP CONSTRAINT IF EXISTS spell_tier_votes_vote_check;
ALTER TABLE spell_tier_votes ADD CONSTRAINT spell_tier_votes_vote_check
  CHECK (vote IN ('S', 'A', 'B', 'C', 'D', 'E'));

-- 2. Update upsert RPC
CREATE OR REPLACE FUNCTION upsert_spell_tier_vote(p_spell_name TEXT, p_vote TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_vote NOT IN ('S', 'A', 'B', 'C', 'D', 'E') THEN
    RETURN json_build_object('error', 'Invalid vote. Must be S, A, B, C, D, or E');
  END IF;

  INSERT INTO spell_tier_votes (user_id, spell_name, vote)
  VALUES (auth.uid(), p_spell_name, p_vote)
  ON CONFLICT (user_id, spell_name)
  DO UPDATE SET vote = p_vote, voted_at = now();

  RETURN json_build_object('success', true, 'spell_name', p_spell_name, 'vote', p_vote);
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_spell_tier_vote(TEXT, TEXT) TO authenticated;

-- 3. Update stats RPC to return per-tier breakdown
CREATE OR REPLACE FUNCTION get_spell_tier_stats(p_spell_name TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH vote_data AS (
    SELECT
      spell_name,
      COUNT(*) FILTER (WHERE vote = 'S')::int AS tier_s,
      COUNT(*) FILTER (WHERE vote = 'A')::int AS tier_a,
      COUNT(*) FILTER (WHERE vote = 'B')::int AS tier_b,
      COUNT(*) FILTER (WHERE vote = 'C')::int AS tier_c,
      COUNT(*) FILTER (WHERE vote = 'D')::int AS tier_d,
      COUNT(*) FILTER (WHERE vote = 'E')::int AS tier_e,
      COUNT(*)::int                            AS total_votes
    FROM spell_tier_votes
    WHERE (p_spell_name IS NULL OR spell_name = p_spell_name)
    GROUP BY spell_name
    ORDER BY COUNT(*) DESC
    LIMIT 20
  )
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'spell_name',  vd.spell_name,
        'tier_s',      vd.tier_s,
        'tier_a',      vd.tier_a,
        'tier_b',      vd.tier_b,
        'tier_c',      vd.tier_c,
        'tier_d',      vd.tier_d,
        'tier_e',      vd.tier_e,
        'total_votes', vd.total_votes
      )
    ),
    '[]'::json
  )
  FROM vote_data vd;
$$;

GRANT EXECUTE ON FUNCTION get_spell_tier_stats(TEXT) TO anon, authenticated;
