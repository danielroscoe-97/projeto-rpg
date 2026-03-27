-- Migration 019: Combatants V2 — display_name, monster groups
-- Shared by Epic 1 (Story 1.2: display_name) and Epic 2 (Story 2.1: grouping)

ALTER TABLE combatants ADD COLUMN display_name TEXT NULL DEFAULT NULL;
ALTER TABLE combatants ADD COLUMN monster_group_id UUID NULL DEFAULT NULL;
ALTER TABLE combatants ADD COLUMN group_order INTEGER NULL DEFAULT NULL;

-- Composite index for efficient group queries within an encounter
CREATE INDEX idx_combatants_group ON combatants(encounter_id, monster_group_id)
  WHERE monster_group_id IS NOT NULL;
