-- ============================================================
-- 105: Add spell_votes count to user methodology contribution
-- ============================================================

-- Update contribution RPC to include spell vote count
CREATE OR REPLACE FUNCTION get_user_methodology_contribution(p_user_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_encounters AS (
    SELECT
      e.id,
      e.dm_difficulty_rating
    FROM encounters e
    JOIN sessions s ON s.id = e.session_id
    WHERE s.owner_id = p_user_id
      AND e.party_snapshot IS NOT NULL
      AND e.creatures_snapshot IS NOT NULL
      AND e.combat_result IS NOT NULL
  ),
  is_excluded AS (
    SELECT EXISTS (
      SELECT 1 FROM excluded_accounts WHERE user_id = p_user_id
    ) AS excluded
  ),
  stats AS (
    SELECT
      COUNT(*)::int AS total_combats,
      COUNT(*) FILTER (WHERE dm_difficulty_rating IS NOT NULL)::int AS rated_combats
    FROM user_encounters
  ),
  vote_stats AS (
    SELECT COUNT(*)::int AS spell_votes
    FROM spell_tier_votes
    WHERE user_id = p_user_id
  )
  SELECT json_build_object(
    'total_combats', CASE WHEN ie.excluded THEN 0 ELSE s.total_combats END,
    'rated_combats', CASE WHEN ie.excluded THEN 0 ELSE s.rated_combats END,
    'is_researcher', NOT ie.excluded AND s.rated_combats >= 10,
    'spell_votes', vs.spell_votes
  )
  FROM stats s, is_excluded ie, vote_stats vs;
$$;
