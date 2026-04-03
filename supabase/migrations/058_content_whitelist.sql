-- 058_content_whitelist.sql
-- Epic: Content Access Control (CAC-E1-F1)
-- Beta tester whitelist for gated compendium content

CREATE TABLE content_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(user_id)
);

-- Partial index: fast lookup for active whitelist entries
CREATE INDEX idx_content_whitelist_user_active
  ON content_whitelist(user_id)
  WHERE revoked_at IS NULL;

-- RLS
ALTER TABLE content_whitelist ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can check their own whitelist status
CREATE POLICY "Users can check own whitelist status"
  ON content_whitelist FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all entries
CREATE POLICY "Admins can view all whitelist entries"
  ON content_whitelist FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins can add to whitelist
CREATE POLICY "Admins can add to whitelist"
  ON content_whitelist FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins can update whitelist (soft delete via revoked_at)
CREATE POLICY "Admins can update whitelist"
  ON content_whitelist FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );
