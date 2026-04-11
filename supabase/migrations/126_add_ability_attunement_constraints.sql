-- M8: Add CHECK constraint: current_uses cannot exceed max_uses
ALTER TABLE character_abilities
  ADD CONSTRAINT ability_uses_within_max
  CHECK (max_uses IS NULL OR current_uses <= max_uses);

-- Add composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_character_abilities_char_order
  ON character_abilities(player_character_id, display_order);

-- M9: Add trigger to enforce max 3 attuned items per character
CREATE OR REPLACE FUNCTION check_attunement_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_attuned = true THEN
    IF (SELECT COUNT(*) FROM character_inventory_items
        WHERE player_character_id = NEW.player_character_id
        AND is_attuned = true
        AND id != NEW.id) >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 attuned items per character';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_attunement_limit
  BEFORE INSERT OR UPDATE ON character_inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION check_attunement_limit();
