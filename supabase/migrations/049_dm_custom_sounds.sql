-- DM custom sounds for soundboard
CREATE TABLE IF NOT EXISTS dm_custom_sounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  emoji TEXT NOT NULL DEFAULT '🎵',
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 5242880),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE dm_custom_sounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sounds"
  ON dm_custom_sounds FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sounds"
  ON dm_custom_sounds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sounds"
  ON dm_custom_sounds FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_dm_custom_sounds_user ON dm_custom_sounds(user_id);

-- Storage bucket for DM custom sounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('dm-custom-sounds', 'dm-custom-sounds', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own dm sounds"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dm-custom-sounds'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own dm sounds"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dm-custom-sounds'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read for playback (bucket is public)
CREATE POLICY "Public read for dm custom sounds"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dm-custom-sounds');
