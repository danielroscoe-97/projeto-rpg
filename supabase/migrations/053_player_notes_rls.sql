-- Migration 053: Player notes RLS
-- Allows authenticated players to INSERT/UPDATE/DELETE their own notes
-- in campaigns they are members of.

-- Index for player-scoped queries (avoid seq scan on large tables)
CREATE INDEX IF NOT EXISTS idx_campaign_notes_user ON campaign_notes(user_id);

-- Players can read their own notes (private or shared)
DROP POLICY IF EXISTS "player_own_notes_select" ON campaign_notes;
CREATE POLICY "player_own_notes_select" ON campaign_notes
  FOR SELECT USING (
    user_id = auth.uid()
    AND public.is_campaign_member(campaign_id)
  );

-- Players can create notes in campaigns they belong to
DROP POLICY IF EXISTS "player_notes_insert" ON campaign_notes;
CREATE POLICY "player_notes_insert" ON campaign_notes
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND public.is_campaign_member(campaign_id)
  );

-- Players can update their own notes
DROP POLICY IF EXISTS "player_notes_update" ON campaign_notes;
CREATE POLICY "player_notes_update" ON campaign_notes
  FOR UPDATE USING (
    user_id = auth.uid()
    AND public.is_campaign_member(campaign_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_campaign_member(campaign_id)
  );

-- Players can delete their own notes
DROP POLICY IF EXISTS "player_notes_delete" ON campaign_notes;
CREATE POLICY "player_notes_delete" ON campaign_notes
  FOR DELETE USING (
    user_id = auth.uid()
    AND public.is_campaign_member(campaign_id)
  );
