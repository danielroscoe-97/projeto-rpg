-- ============================================================
-- 097: Methodology — Code review patches
-- Fixes: exclusive quality tiers, spell_name length check
-- ============================================================

-- ─── 1. Fix quality tiers to be exclusive (gold + silver + bronze = total) ────
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
      -- Quality tiers (exclusive: gold + silver + bronze = valid_combats)
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

-- ─── 2. Add spell_name length constraint ─────────────────────────────────────
ALTER TABLE spell_tier_votes
  ADD CONSTRAINT chk_spell_name_length CHECK (char_length(spell_name) <= 100);
