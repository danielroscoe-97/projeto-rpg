-- ============================================================================
-- Migration 029: Add DM notes field to player characters
-- Free-text notes for DM annotations (e.g. "Has cursed sword", "Owes 50gp")
-- ============================================================================

ALTER TABLE player_characters
  ADD COLUMN IF NOT EXISTS dm_notes TEXT DEFAULT '';
