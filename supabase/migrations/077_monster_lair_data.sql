-- Add lair actions and regional effects columns to monsters table
-- These store D&D 5e lair-specific data for creatures that have a lair
ALTER TABLE monsters
  ADD COLUMN IF NOT EXISTS lair_actions JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lair_actions_intro TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS regional_effects JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS regional_effects_intro TEXT DEFAULT NULL;

COMMENT ON COLUMN monsters.lair_actions IS 'Array of {name, desc} objects for lair actions (initiative count 20)';
COMMENT ON COLUMN monsters.lair_actions_intro IS 'Introductory text for lair actions section';
COMMENT ON COLUMN monsters.regional_effects IS 'Array of {name, desc} objects for regional effects around the lair';
COMMENT ON COLUMN monsters.regional_effects_intro IS 'Introductory text for regional effects section';
