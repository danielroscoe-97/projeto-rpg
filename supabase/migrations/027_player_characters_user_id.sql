-- ============================================================================
-- Migration 027: Add user_id to player_characters for auto-join
-- Story v2-3-3 — Player auto-join requires linking characters to users
-- ============================================================================

-- Add nullable user_id column (existing characters won't have it)
ALTER TABLE player_characters
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for fast lookup: "find my characters in this campaign"
CREATE INDEX IF NOT EXISTS idx_player_characters_user_id
  ON player_characters(user_id)
  WHERE user_id IS NOT NULL;

-- RLS: allow authenticated users to read their own characters across campaigns
CREATE POLICY "Users can read own characters"
  ON player_characters FOR SELECT
  USING (auth.uid() = user_id);
