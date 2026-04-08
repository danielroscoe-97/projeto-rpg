-- 109_character_inventory.sql
-- Personal inventory items per character

CREATE TABLE IF NOT EXISTS character_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  equipped BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT char_inv_quantity_positive CHECK (quantity >= 1)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_char_inventory_character
  ON character_inventory_items(player_character_id);

-- RLS
ALTER TABLE character_inventory_items ENABLE ROW LEVEL SECURITY;

-- Owner can do everything with their character's items
CREATE POLICY character_inventory_owner ON character_inventory_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = character_inventory_items.player_character_id
      AND user_id = auth.uid()
    )
  );

-- DM can view items (for campaign context)
CREATE POLICY character_inventory_dm_read ON character_inventory_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM player_characters pc
      JOIN campaign_members cm ON cm.campaign_id = pc.campaign_id
      WHERE pc.id = character_inventory_items.player_character_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'dm'
    )
  );
