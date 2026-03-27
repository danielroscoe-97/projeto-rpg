-- 019_session_files.sql
-- Story 4.2: File sharing in session — DM uploads files for players to view

CREATE TABLE session_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')),
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_files_session ON session_files(session_id);

ALTER TABLE session_files ENABLE ROW LEVEL SECURITY;

-- DM can insert and delete their own files
CREATE POLICY session_files_dm_insert ON session_files
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = session_files.session_id AND sessions.owner_id = auth.uid()
    )
  );

CREATE POLICY session_files_dm_delete ON session_files
  FOR DELETE USING (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = session_files.session_id AND sessions.owner_id = auth.uid()
    )
  );

-- All session participants can view files (DM + players with valid token)
CREATE POLICY session_files_view ON session_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sessions WHERE sessions.id = session_files.session_id AND sessions.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM session_tokens WHERE session_tokens.session_id = session_files.session_id AND session_tokens.anon_user_id = auth.uid()
    )
  );
