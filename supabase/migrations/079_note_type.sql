-- Add note_type to campaign_notes for mind map visualization
ALTER TABLE campaign_notes
ADD COLUMN note_type text NOT NULL DEFAULT 'general';

ALTER TABLE campaign_notes
ADD CONSTRAINT campaign_notes_note_type_check
CHECK (note_type IN ('general', 'lore', 'location', 'npc', 'session_recap', 'secret', 'plot_hook'));

-- Index for filtering by type
CREATE INDEX idx_campaign_notes_type ON campaign_notes (campaign_id, note_type);

COMMENT ON COLUMN campaign_notes.note_type IS 'Note category for mind map visualization and organization';
