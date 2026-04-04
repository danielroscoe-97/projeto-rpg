-- 103_encounter_time_analytics.sql
-- CTA-10: Persist combat time analytics in encounters table for longitudinal analysis

ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS turn_time_data JSONB;

COMMENT ON COLUMN encounters.duration_seconds IS
  'Total combat duration in seconds (from first initiative to end encounter)';
COMMENT ON COLUMN encounters.turn_time_data IS
  'Per-combatant turn time accumulation: { combatant_id: milliseconds }';
