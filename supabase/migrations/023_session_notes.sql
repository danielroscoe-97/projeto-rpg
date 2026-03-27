-- 018_session_notes.sql
-- Story 4.1: GM Private Notes — DM-only session notes with auto-save

CREATE TABLE session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_session_notes_session ON session_notes(session_id);

-- RLS: only the DM who owns the session can read/write their notes
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_notes_owner_all ON session_notes
  FOR ALL USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = session_notes.session_id AND sessions.owner_id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE TRIGGER trg_session_notes_updated_at
  BEFORE UPDATE ON session_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
