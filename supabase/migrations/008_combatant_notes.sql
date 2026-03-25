-- 008_combatant_notes.sql
-- Add dual notes fields to combatants (Epic 8: Kastark Simplicity)
-- dm_notes: private to DM, never broadcast to players
-- player_notes: visible to everyone, broadcast via realtime

ALTER TABLE combatants ADD COLUMN dm_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE combatants ADD COLUMN player_notes TEXT NOT NULL DEFAULT '';
