-- ============================================================================
-- 092: Encounter Snapshots + DM Post-Combat Feedback
-- Extends encounters table for Sprint 3 post-combat data collection
-- ============================================================================

ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS dm_difficulty_rating SMALLINT
    CHECK (dm_difficulty_rating IS NULL OR dm_difficulty_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS dm_notes TEXT,
  ADD COLUMN IF NOT EXISTS party_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS creatures_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS combat_result TEXT
    CHECK (combat_result IS NULL OR combat_result IN ('victory','tpk','fled','dm_ended')),
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preset_origin_id UUID REFERENCES encounter_presets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS was_modified_from_preset BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_manual_creatures BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_unknown_cr BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_incomplete_party BOOLEAN DEFAULT false;

COMMENT ON COLUMN encounters.dm_difficulty_rating IS 'DM difficulty rating (1-5) from post-combat feedback';
COMMENT ON COLUMN encounters.dm_notes IS 'Optional DM notes from post-combat feedback';
COMMENT ON COLUMN encounters.party_snapshot IS 'JSONB snapshot of party members at end of combat';
COMMENT ON COLUMN encounters.creatures_snapshot IS 'JSONB snapshot of creatures at end of combat';
COMMENT ON COLUMN encounters.combat_result IS 'How combat ended: victory, tpk, fled, or dm_ended';
COMMENT ON COLUMN encounters.started_at IS 'Timestamp when combat started';
COMMENT ON COLUMN encounters.ended_at IS 'Timestamp when combat ended';
COMMENT ON COLUMN encounters.preset_origin_id IS 'FK to encounter_presets if built from a preset';
COMMENT ON COLUMN encounters.was_modified_from_preset IS 'Whether the encounter was modified after loading from preset';
COMMENT ON COLUMN encounters.has_manual_creatures IS 'Data quality flag: encounter has manually-added creatures without monster_id';
COMMENT ON COLUMN encounters.has_unknown_cr IS 'Data quality flag: encounter has creatures without mappable CR';
COMMENT ON COLUMN encounters.has_incomplete_party IS 'Data quality flag: encounter has players without class or level';
