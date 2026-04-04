-- ============================================================
-- 096: Methodology — Quality Tiers, Spell Voting, Contribution RPC, Similar Encounters
-- Epic: docs/epic-metodologia-pocket-dm.md
-- ============================================================

-- ─── 1. RPC: get_user_methodology_contribution ───────────────────────────────
-- Replaces 2 client queries with a single server-side function.
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
  stats AS (
    SELECT
      COUNT(*)::int AS total_combats,
      COUNT(*) FILTER (WHERE dm_difficulty_rating IS NOT NULL)::int AS rated_combats
    FROM user_encounters
  )
  SELECT json_build_object(
    'total_combats', s.total_combats,
    'rated_combats', s.rated_combats,
    'is_researcher', s.rated_combats >= 10
  )
  FROM stats s;
$$;

GRANT EXECUTE ON FUNCTION get_user_methodology_contribution(UUID) TO authenticated;

-- ─── 2. Replace get_methodology_stats() — add quality tiers ──────────────────
CREATE OR REPLACE FUNCTION get_methodology_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH valid_encounters AS (
    SELECT
      e.id,
      s.owner_id,
      e.dm_difficulty_rating,
      e.difficulty_votes
    FROM encounters e
    JOIN sessions s ON s.id = e.session_id
    WHERE e.party_snapshot IS NOT NULL
      AND e.creatures_snapshot IS NOT NULL
      AND s.owner_id NOT IN (SELECT user_id FROM excluded_accounts)
      AND e.combat_result IS NOT NULL
  ),
  stats AS (
    SELECT
      COUNT(*)::int                                          AS valid_combats,
      COUNT(*) FILTER (WHERE dm_difficulty_rating IS NOT NULL)::int AS combats_with_dm_rating,
      COUNT(DISTINCT owner_id)::int                          AS unique_dms,
      -- Quality tiers (exclusive: gold + silver_only + bronze_only = valid_combats)
      COUNT(*) FILTER (
        WHERE dm_difficulty_rating IS NOT NULL
          AND COALESCE(difficulty_votes, 0) >= 3
      )::int AS gold_count,
      COUNT(*) FILTER (
        WHERE (dm_difficulty_rating IS NOT NULL OR COALESCE(difficulty_votes, 0) >= 1)
          AND NOT (dm_difficulty_rating IS NOT NULL AND COALESCE(difficulty_votes, 0) >= 3)
      )::int AS silver_count,
      COUNT(*) FILTER (
        WHERE dm_difficulty_rating IS NULL
          AND COALESCE(difficulty_votes, 0) < 1
      )::int AS bronze_count
    FROM valid_encounters
  )
  SELECT json_build_object(
    'valid_combats',          s.valid_combats,
    'combats_with_dm_rating', s.combats_with_dm_rating,
    'unique_dms',             s.unique_dms,
    'current_phase',          CASE
                                WHEN s.valid_combats < 500  THEN 'collecting'
                                WHEN s.valid_combats < 2000 THEN 'exploratory'
                                WHEN s.valid_combats < 5000 THEN 'model_v1'
                                ELSE 'contextual'
                              END,
    'phase_target',           CASE
                                WHEN s.valid_combats < 500  THEN 500
                                WHEN s.valid_combats < 2000 THEN 2000
                                WHEN s.valid_combats < 5000 THEN 5000
                                ELSE 10000
                              END,
    'gold_count',             s.gold_count,
    'silver_count',           s.silver_count,
    'bronze_count',           s.bronze_count
  )
  FROM stats s;
$$;

-- ─── 3. RPC: get_similar_encounters ──────────────────────────────────────────
-- Preview descritivo: finds encounters with similar party size & creature count.
CREATE OR REPLACE FUNCTION get_similar_encounters(p_party_size INT, p_creature_count INT)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH matches AS (
    SELECT
      e.dm_difficulty_rating,
      e.difficulty_rating AS player_avg_rating
    FROM encounters e
    JOIN sessions s ON s.id = e.session_id
    WHERE e.party_snapshot IS NOT NULL
      AND e.creatures_snapshot IS NOT NULL
      AND e.combat_result IS NOT NULL
      AND e.dm_difficulty_rating IS NOT NULL
      AND s.owner_id NOT IN (SELECT user_id FROM excluded_accounts)
      AND jsonb_array_length(e.party_snapshot) BETWEEN (p_party_size - 1) AND (p_party_size + 1)
      AND jsonb_array_length(e.creatures_snapshot) BETWEEN GREATEST(1, p_creature_count - 2) AND (p_creature_count + 2)
  ),
  agg AS (
    SELECT
      COUNT(*)::int AS match_count,
      ROUND(AVG(dm_difficulty_rating)::numeric, 1) AS avg_dm_rating,
      ROUND(AVG(player_avg_rating)::numeric, 1) AS avg_player_rating
    FROM matches
  )
  SELECT json_build_object(
    'match_count',       a.match_count,
    'avg_dm_rating',     a.avg_dm_rating,
    'avg_player_rating', a.avg_player_rating,
    'has_enough_data',   a.match_count >= 5
  )
  FROM agg a;
$$;

GRANT EXECUTE ON FUNCTION get_similar_encounters(INT, INT) TO anon, authenticated;

-- ─── 4. Spell Tier Votes table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spell_tier_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spell_name TEXT NOT NULL CHECK (char_length(spell_name) <= 100),
  vote       TEXT NOT NULL CHECK (vote IN ('under_tiered', 'correct', 'over_tiered')),
  voted_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One vote per user per spell
CREATE UNIQUE INDEX IF NOT EXISTS uq_spell_tier_vote
  ON spell_tier_votes (user_id, spell_name);

-- Enable RLS
ALTER TABLE spell_tier_votes ENABLE ROW LEVEL SECURITY;

-- Users can read all votes (aggregated in RPC), insert/update their own
CREATE POLICY "Users can insert own spell votes"
  ON spell_tier_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spell votes"
  ON spell_tier_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read spell votes"
  ON spell_tier_votes FOR SELECT TO anon, authenticated
  USING (true);

-- ─── 5. RPC: get_spell_tier_stats ────────────────────────────────────────────
-- Returns aggregated voting stats for a specific spell (or top voted spells).
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
      COUNT(*) FILTER (WHERE vote = 'under_tiered')::int AS under_tiered,
      COUNT(*) FILTER (WHERE vote = 'correct')::int      AS correct,
      COUNT(*) FILTER (WHERE vote = 'over_tiered')::int  AS over_tiered,
      COUNT(*)::int                                       AS total_votes
    FROM spell_tier_votes
    WHERE (p_spell_name IS NULL OR spell_name = p_spell_name)
    GROUP BY spell_name
    ORDER BY COUNT(*) DESC
    LIMIT 20
  )
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'spell_name',    vd.spell_name,
        'under_tiered',  vd.under_tiered,
        'correct',       vd.correct,
        'over_tiered',   vd.over_tiered,
        'total_votes',   vd.total_votes
      )
    ),
    '[]'::json
  )
  FROM vote_data vd;
$$;

GRANT EXECUTE ON FUNCTION get_spell_tier_stats(TEXT) TO anon, authenticated;

-- ─── 6. RPC: upsert_spell_tier_vote ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_spell_tier_vote(p_spell_name TEXT, p_vote TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_vote NOT IN ('under_tiered', 'correct', 'over_tiered') THEN
    RETURN json_build_object('error', 'Invalid vote value');
  END IF;

  INSERT INTO spell_tier_votes (user_id, spell_name, vote)
  VALUES (auth.uid(), p_spell_name, p_vote)
  ON CONFLICT (user_id, spell_name)
  DO UPDATE SET vote = p_vote, voted_at = now();

  RETURN json_build_object('success', true, 'spell_name', p_spell_name, 'vote', p_vote);
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_spell_tier_vote(TEXT, TEXT) TO authenticated;
