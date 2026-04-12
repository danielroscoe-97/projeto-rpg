-- Migration 135: Audio Favorites
-- Allows players and DMs to bookmark preset sounds for quick access during combat

CREATE TABLE audio_favorites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_id   TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'preset' CHECK (source IN ('preset', 'custom')),
  position    SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each user can favorite a given preset only once
CREATE UNIQUE INDEX idx_audio_favorites_user_preset ON audio_favorites(user_id, preset_id, source);
-- Fast lookup for a user's favorites ordered by position
CREATE INDEX idx_audio_favorites_user_pos ON audio_favorites(user_id, position);

ALTER TABLE audio_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites"
  ON audio_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
