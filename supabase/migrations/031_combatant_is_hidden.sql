-- 031_combatant_is_hidden.sql
-- Add is_hidden column to combatants table.
-- Hidden combatants are DM-only and not visible to players until revealed.

ALTER TABLE combatants ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false;
