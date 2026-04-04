-- Track NPC alive/dead status for mind map visualization
ALTER TABLE campaign_npcs
ADD COLUMN is_alive boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN campaign_npcs.is_alive IS 'Whether the NPC is alive; dead NPCs show differently in the mind map';
