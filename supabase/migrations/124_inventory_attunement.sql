-- 124_inventory_attunement.sql
-- Epic: Character Abilities & Attunement — AT-01
-- Expand character_inventory_items with attunement + magic item fields

ALTER TABLE character_inventory_items
  ADD COLUMN IF NOT EXISTS is_attuned    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rarity        TEXT,
  ADD COLUMN IF NOT EXISTS is_magic      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attune_notes  TEXT,
  ADD COLUMN IF NOT EXISTS srd_ref       TEXT;
