-- Migration 019: Mesa Model — dm_plan snapshot on sessions (Epic 5, Story 5.5)
-- dm_plan is a SNAPSHOT at session creation time (never updated when subscription changes)

ALTER TABLE sessions ADD COLUMN dm_plan TEXT DEFAULT 'free';

-- Add check constraint
ALTER TABLE sessions ADD CONSTRAINT sessions_dm_plan_check
  CHECK (dm_plan IN ('free', 'pro', 'mesa'));

-- Comment for clarity
COMMENT ON COLUMN sessions.dm_plan IS 'Snapshot of DM plan at session creation. Players inherit Pro features if pro/mesa. Never updated mid-session (NFR34 graceful degradation).';
