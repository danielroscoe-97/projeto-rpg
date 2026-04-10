-- Enriched combat snapshots for difficulty analysis
-- Stores start-of-combat state so we can compute HP deltas, party vulnerability, etc.

ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS combat_start_snapshot JSONB;

COMMENT ON COLUMN encounters.combat_start_snapshot IS
  'Snapshot of all combatants at combat start (HP, AC, initiative). Used for difficulty analysis — compare start vs end state.';
