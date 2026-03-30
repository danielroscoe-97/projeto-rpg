-- Campaign Note Folders
CREATE TABLE campaign_note_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES campaign_note_folders(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE campaign_note_folders ENABLE ROW LEVEL SECURITY;

-- RLS: Only campaign owner can manage folders
CREATE POLICY "campaign_note_folders_owner" ON campaign_note_folders
  FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE owner_id = auth.uid())
  );

-- Members can view folders (for shared notes navigation)
CREATE POLICY "campaign_note_folders_member_read" ON campaign_note_folders
  FOR SELECT USING (
    campaign_id IN (
      SELECT campaign_id FROM campaign_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Add folder_id and is_shared to existing campaign_notes
ALTER TABLE campaign_notes ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES campaign_note_folders(id) ON DELETE SET NULL;
ALTER TABLE campaign_notes ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Index for folder queries
CREATE INDEX idx_note_folders_campaign ON campaign_note_folders(campaign_id);
CREATE INDEX idx_notes_folder ON campaign_notes(folder_id);

-- Players can see shared notes (new policy)
-- The existing "DM can manage own campaign notes" policy (migration 030) covers DM access.
-- This new policy allows active campaign members to read shared notes.
CREATE POLICY "campaign_notes_shared_read" ON campaign_notes
  FOR SELECT USING (
    is_shared = true AND
    campaign_id IN (
      SELECT campaign_id FROM campaign_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
