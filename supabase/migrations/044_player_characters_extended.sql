-- 044_player_characters_extended.sql
-- Story 3.1 + 3.2: Add notes and token_url to player_characters.
-- race, class, and level were already added in migration 038.

ALTER TABLE player_characters ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE player_characters ADD COLUMN IF NOT EXISTS token_url TEXT;

-- Storage bucket for player character avatar tokens (public, images only, max 2MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-avatars',
  'player-avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies: player can manage files in their own folder
CREATE POLICY player_avatars_storage_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'player-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY player_avatars_storage_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'player-avatars'
  );

CREATE POLICY player_avatars_storage_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'player-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY player_avatars_storage_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'player-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
