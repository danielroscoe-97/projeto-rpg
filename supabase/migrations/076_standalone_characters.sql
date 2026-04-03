-- 051_standalone_characters.sql
-- Allow player_characters to exist without a campaign (standalone).
-- Players can create and manage characters before joining any campaign.
-- When accepting an invite, they can link an existing character instead of creating a new one.
-- A character can only belong to one campaign at a time (NULL = standalone, UUID = linked).

-- Make campaign_id nullable (was NOT NULL since migration 001)
ALTER TABLE player_characters
  ALTER COLUMN campaign_id DROP NOT NULL;

-- RLS: player can insert their own standalone character
CREATE POLICY player_characters_user_insert ON player_characters
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND campaign_id IS NULL
  );

-- RLS: player can update their own character (edit stats, link/unlink campaign)
CREATE POLICY player_characters_user_update ON player_characters
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS: player can delete their own character
CREATE POLICY player_characters_user_delete ON player_characters
  FOR DELETE USING (auth.uid() = user_id);
