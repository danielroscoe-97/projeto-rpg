-- Add DM heartbeat column to sessions table
-- Players use this to detect when the DM disconnects

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dm_last_seen_at TIMESTAMPTZ;

-- Index for stale DM detection queries
CREATE INDEX IF NOT EXISTS idx_sessions_dm_last_seen ON sessions(dm_last_seen_at)
  WHERE is_active = true AND dm_last_seen_at IS NOT NULL;
