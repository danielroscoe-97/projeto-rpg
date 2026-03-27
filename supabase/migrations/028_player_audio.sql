-- Migration 028: Player Audio Files
-- Supports Epic 6 — Player Sound Effects (Soundboard de Combate)
-- Players can upload up to 6 MP3s (max 3MB each) to their account (global, not per-session)

-- Table for player audio file metadata
CREATE TABLE player_audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL CHECK (char_length(file_name) <= 50),
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 3145728),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_audio_user ON player_audio_files(user_id);

ALTER TABLE player_audio_files ENABLE ROW LEVEL SECURITY;

-- Player can view their own audio files
CREATE POLICY player_audio_own_select ON player_audio_files
  FOR SELECT USING (auth.uid() = user_id);

-- Player can insert (max 6 files enforced via count check)
CREATE POLICY player_audio_own_insert ON player_audio_files
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (SELECT count(*) FROM player_audio_files WHERE user_id = auth.uid()) < 6
  );

-- Player can delete their own audio files
CREATE POLICY player_audio_own_delete ON player_audio_files
  FOR DELETE USING (auth.uid() = user_id);

-- DM can view audio files of players in their sessions (for preload)
CREATE POLICY player_audio_dm_view ON player_audio_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM session_tokens st
      JOIN sessions s ON s.id = st.session_id
      WHERE st.anon_user_id = player_audio_files.user_id
      AND s.owner_id = auth.uid()
    )
  );

-- Storage bucket for player audio (private, MP3 only, max 3MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-audio',
  'player-audio',
  false,
  3145728,
  ARRAY['audio/mpeg']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies: player can manage files in their own folder
CREATE POLICY player_audio_storage_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'player-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY player_audio_storage_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'player-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY player_audio_storage_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'player-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DM can read audio files of players in their sessions
CREATE POLICY player_audio_storage_dm_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'player-audio'
    AND EXISTS (
      SELECT 1 FROM session_tokens st
      JOIN sessions s ON s.id = st.session_id
      WHERE st.anon_user_id = (storage.foldername(name))[1]::uuid
      AND s.owner_id = auth.uid()
    )
  );
