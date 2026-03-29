-- 038_player_characters_extended.sql
-- Story A.6: Add optional race, class, and level fields to player_characters.
-- These are needed for the PlayerCampaignView to display character details
-- (e.g. "Anão Guerreiro · Nível 5"). All fields are nullable / have defaults
-- for backward compatibility with existing characters.

ALTER TABLE player_characters
  ADD COLUMN IF NOT EXISTS race TEXT,
  ADD COLUMN IF NOT EXISTS class TEXT,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT NULL;
