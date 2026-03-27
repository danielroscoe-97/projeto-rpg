-- Migration 018: Feature flags table (Epic 5, Story 5.1)
-- Stores per-feature gating configuration

CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  plan_required TEXT DEFAULT 'pro' CHECK (plan_required IN ('free', 'pro', 'mesa')),
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read flags (client-side gating needs this)
CREATE POLICY "Anyone reads feature flags"
  ON feature_flags FOR SELECT
  USING (true);

-- Only admins manage flags
CREATE POLICY "Admin manages feature flags"
  ON feature_flags FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admin updates feature flags"
  ON feature_flags FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admin deletes feature flags"
  ON feature_flags FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Seed 8 Pro-gated features
INSERT INTO feature_flags (key, enabled, plan_required, description) VALUES
  ('persistent_campaigns', true, 'pro', 'Persistent campaigns across sessions'),
  ('saved_presets', true, 'pro', 'Save and load monster presets'),
  ('export_data', true, 'pro', 'Export encounter and session data'),
  ('homebrew', true, 'pro', 'Create custom monsters, spells, and items'),
  ('session_analytics', true, 'pro', 'Session analytics and statistics'),
  ('cr_calculator', true, 'pro', 'Challenge rating calculator'),
  ('file_sharing', true, 'pro', 'Share files within sessions'),
  ('email_invites', true, 'pro', 'Send email invitations for campaigns');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flags_updated_at();
