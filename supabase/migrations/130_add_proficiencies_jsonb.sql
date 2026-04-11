-- Add proficiencies JSONB column to player_characters
-- Stores: saving_throws, skills (with proficiency/expertise), tools, languages, armor, weapons
ALTER TABLE player_characters
  ADD COLUMN IF NOT EXISTS proficiencies jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN player_characters.proficiencies IS
  'JSONB: { saving_throws: string[], skills: Record<skill, "proficient"|"expertise">, tools: string[], languages: string[], armor: string[], weapons: string[] }';
