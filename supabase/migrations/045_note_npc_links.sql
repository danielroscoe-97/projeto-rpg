CREATE TABLE note_npc_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES campaign_notes(id) ON DELETE CASCADE,
  npc_id UUID NOT NULL REFERENCES campaign_npcs(id) ON DELETE CASCADE,
  UNIQUE(note_id, npc_id)
);
ALTER TABLE note_npc_links ENABLE ROW LEVEL SECURITY;

-- RLS: Campaign owner can manage links
CREATE POLICY "note_npc_links_owner" ON note_npc_links
  FOR ALL USING (
    note_id IN (
      SELECT cn.id FROM campaign_notes cn
      JOIN campaigns c ON cn.campaign_id = c.id
      WHERE c.owner_id = auth.uid()
    )
  );

-- Members can view links for shared notes
CREATE POLICY "note_npc_links_member_read" ON note_npc_links
  FOR SELECT USING (
    note_id IN (
      SELECT cn.id FROM campaign_notes cn
      WHERE cn.is_shared = true AND cn.campaign_id IN (
        SELECT campaign_id FROM campaign_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );
