-- 004_session_tokens.sql
-- Table: session_tokens (anonymous player auth via /join/[token])

CREATE TABLE session_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  player_name TEXT,
  anon_user_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_session_tokens_token ON session_tokens(token);
CREATE INDEX idx_session_tokens_session_id ON session_tokens(session_id);
CREATE INDEX idx_session_tokens_anon_user_id ON session_tokens(anon_user_id);
