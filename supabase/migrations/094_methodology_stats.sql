-- ============================================================
-- 094: Methodology Stats — excluded_accounts + get_methodology_stats RPC
-- Epic: docs/epic-metodologia-pocket-dm.md
-- Sprint: METH-0.1
-- ============================================================

-- 1. Excluded accounts table — filter out admin/QA/test data from methodology stats
CREATE TABLE IF NOT EXISTS excluded_accounts (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason    TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE excluded_accounts IS 'Accounts excluded from methodology stats (admin, QA, test accounts)';

-- RLS: only service role can read/write (no public access)
ALTER TABLE excluded_accounts ENABLE ROW LEVEL SECURITY;

-- 2. Insert admin account
-- (Uses subquery to safely handle case where email doesn't exist yet)
INSERT INTO excluded_accounts (user_id, reason)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'danielroscoe97@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- 3. RPC: get_methodology_stats
-- Returns aggregated stats for the methodology community page.
-- All data is anonymous/aggregated — never exposes individual user data.
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
      e.dm_difficulty_rating
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
      COUNT(DISTINCT owner_id)::int                          AS unique_dms
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
                              END
  )
  FROM stats s;
$$;

-- Grant execute to anon + authenticated (public endpoint, aggregated data only)
GRANT EXECUTE ON FUNCTION get_methodology_stats() TO anon, authenticated;
