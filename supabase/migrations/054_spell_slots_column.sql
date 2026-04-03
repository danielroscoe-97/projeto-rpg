-- F-41: Add spell_slots JSONB column to player_characters
ALTER TABLE player_characters
  ADD COLUMN IF NOT EXISTS spell_slots JSONB DEFAULT NULL;

COMMENT ON COLUMN player_characters.spell_slots IS
  'Spell slot tracking: { "1": { "max": 4, "used": 2 }, ... }';
