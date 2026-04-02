-- Add difficulty poll columns to encounters (C.15)
ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS difficulty_rating NUMERIC(2,1),
  ADD COLUMN IF NOT EXISTS difficulty_votes INTEGER DEFAULT 0;

-- P2.02: Enforce valid rating range at DB level
ALTER TABLE encounters
  DROP CONSTRAINT IF EXISTS difficulty_rating_range,
  ADD CONSTRAINT difficulty_rating_range CHECK (difficulty_rating IS NULL OR (difficulty_rating BETWEEN 1.0 AND 5.0));

COMMENT ON COLUMN encounters.difficulty_rating IS 'Average difficulty rating (1.0-5.0) from post-combat poll';
COMMENT ON COLUMN encounters.difficulty_votes IS 'Number of votes in the difficulty poll';
