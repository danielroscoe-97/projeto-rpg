-- 100_npc_visible_default_true.sql
-- Align DB default with UI behavior: NPCs should be visible to players by default.
-- The NpcForm.tsx already sends is_visible_to_players=true on creation,
-- but the DB default was false (from migration 043). This fixes the mismatch
-- so direct inserts or future API calls also default to visible.

ALTER TABLE campaign_npcs ALTER COLUMN is_visible_to_players SET DEFAULT true;
