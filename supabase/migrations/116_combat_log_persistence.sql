-- Combat log persistence for multi-session combats
-- Stores the in-memory combat log (damage, heal, conditions, turns) as JSONB
-- so it survives browser close and can be restored when DM returns.
-- Cleared after encounter ends and combat_report is generated.

ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS combat_log JSONB;

COMMENT ON COLUMN encounters.combat_log IS
  'Persisted combat log entries (CombatLogEntry[]). Saved periodically during combat, cleared after encounter ends.';
