-- ============================================================
-- 069 — Player Quest Notes (personal notes + favorites)
-- Story: PHQ-E7-F16 — Quest Board Player
-- ============================================================

CREATE TABLE player_quest_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id      UUID NOT NULL REFERENCES campaign_quests(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  notes         TEXT,
  is_favorite   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(quest_id, user_id)
);

CREATE INDEX idx_player_quest_notes_user_campaign
  ON player_quest_notes(user_id, campaign_id);

-- RLS: Only the owner can see/edit their own quest notes
ALTER TABLE player_quest_notes ENABLE ROW LEVEL SECURITY;

-- Player can read only their own notes (DM cannot see)
CREATE POLICY player_quest_notes_select ON player_quest_notes
  FOR SELECT USING (
    auth.uid() = user_id
    AND public.is_campaign_member(campaign_id)
  );

-- Player can insert their own notes
CREATE POLICY player_quest_notes_insert ON player_quest_notes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.is_campaign_member(campaign_id)
  );

-- Player can update only their own notes
CREATE POLICY player_quest_notes_update ON player_quest_notes
  FOR UPDATE USING (
    auth.uid() = user_id
  ) WITH CHECK (
    auth.uid() = user_id
  );

-- Player can delete their own notes
CREATE POLICY player_quest_notes_delete ON player_quest_notes
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- Auto-update updated_at
CREATE TRIGGER set_player_quest_notes_updated_at
  BEFORE UPDATE ON player_quest_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
