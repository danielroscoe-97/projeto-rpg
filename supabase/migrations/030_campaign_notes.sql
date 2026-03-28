-- Campaign-level DM notes
CREATE TABLE campaign_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_notes_campaign ON campaign_notes(campaign_id);

ALTER TABLE campaign_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DM can manage own campaign notes"
ON campaign_notes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_notes.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_notes.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);
