-- 093_standalone_character_select.sql
-- BUG-T3-01: Add missing SELECT policy for standalone characters.
-- Players could INSERT standalone characters (via service client) but could
-- not read them back because no user-level SELECT policy existed.

CREATE POLICY player_characters_user_select ON player_characters
  FOR SELECT USING (auth.uid() = user_id);
