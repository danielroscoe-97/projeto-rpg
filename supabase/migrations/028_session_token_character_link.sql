-- Migration: Add player_character_id to session_tokens for DM linking
-- Story F1.2: DM can link a guest/temp player to a campaign character

ALTER TABLE session_tokens
ADD COLUMN player_character_id UUID REFERENCES player_characters(id) ON DELETE SET NULL;

-- Index for quick lookup of linked characters
CREATE INDEX idx_session_tokens_character ON session_tokens(player_character_id) WHERE player_character_id IS NOT NULL;

COMMENT ON COLUMN session_tokens.player_character_id IS 'DM-assigned link between a temporary player and a campaign character. Persists across reconnects.';
