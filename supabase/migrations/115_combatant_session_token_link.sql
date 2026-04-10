-- B1: Link combatants to session_tokens by ID instead of name matching.
-- Fixes token-name mismatch bug (BT2-05/BT2-06) where reconnection fails
-- when DM renames combatant or player registers with a different name.
-- Column is nullable for backwards compatibility with existing combatants.

ALTER TABLE combatants
  ADD COLUMN session_token_id UUID REFERENCES session_tokens(id) ON DELETE SET NULL;

CREATE INDEX idx_combatants_session_token_id ON combatants(session_token_id);

-- Allow players with active tokens to read their own combatant link
-- (existing RLS already covers most access; this index helps perf)
