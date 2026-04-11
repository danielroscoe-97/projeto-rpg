-- Add weight and cost fields to character_inventory_items
ALTER TABLE character_inventory_items
  ADD COLUMN IF NOT EXISTS weight numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cost_gp numeric DEFAULT NULL;

COMMENT ON COLUMN character_inventory_items.weight IS 'Item weight in lbs (nullable, per D&D 5e)';
COMMENT ON COLUMN character_inventory_items.cost_gp IS 'Item cost in gold pieces (nullable)';
