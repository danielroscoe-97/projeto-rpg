-- 014_monster_id_to_text.sql
-- Change combatants.monster_id from UUID to TEXT.
-- SRD monsters use string slugs (e.g. "adult-red-dragon-mm"), not UUIDs.
-- This was causing "invalid input syntax for type uuid" errors when importing
-- guest encounters that contain SRD monsters.

ALTER TABLE combatants
  ALTER COLUMN monster_id TYPE TEXT USING monster_id::TEXT;
