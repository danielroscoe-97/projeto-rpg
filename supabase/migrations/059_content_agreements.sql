-- 059_content_agreements.sql
-- Epic: Content Access Control (CAC-E2-F2)
-- Digital signature / acceptance tracking for gated compendium content

CREATE TABLE content_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  agreement_version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, agreement_version)
);

-- Index for fast user lookups
CREATE INDEX idx_content_agreements_user ON content_agreements(user_id);

-- RLS
ALTER TABLE content_agreements ENABLE ROW LEVEL SECURITY;

-- Users can view their own agreements
CREATE POLICY "Users can view own agreements"
  ON content_agreements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own agreement
CREATE POLICY "Users can create own agreement"
  ON content_agreements FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can view all agreements (audit)
CREATE POLICY "Admins can view all agreements"
  ON content_agreements FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins can delete agreements (revoke)
CREATE POLICY "Admins can delete agreements"
  ON content_agreements FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );
