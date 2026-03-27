-- 017_users_role.sql
-- Story 3.4: Add role column to users table for UI personalization
-- Values: 'player', 'dm', 'both' (default 'both')

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'both'
  CHECK (role IN ('player', 'dm', 'both'));

-- Backfill: existing users default to 'both' (already handled by DEFAULT)
