-- Transform sessions into work units with planning, status, and recap
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_number INTEGER,
  ADD COLUMN IF NOT EXISTS prep_notes TEXT,
  ADD COLUMN IF NOT EXISTS recap TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled'));

-- Auto-increment session_number per campaign
CREATE OR REPLACE FUNCTION set_session_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.session_number := COALESCE(
    (SELECT MAX(session_number) FROM sessions WHERE campaign_id = NEW.campaign_id),
    0
  ) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_session_number_auto
  BEFORE INSERT ON sessions
  FOR EACH ROW
  WHEN (NEW.session_number IS NULL)
  EXECUTE FUNCTION set_session_number();
