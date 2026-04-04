-- ============================================================================
-- Migration 085: Combat Reports — shareable post-combat analytics
-- Stores serialized CombatReport for public sharing, session recaps, and
-- campaign-wide aggregated stats.
-- ============================================================================

CREATE TABLE combat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT NOT NULL UNIQUE,
  encounter_name TEXT NOT NULL DEFAULT 'Encounter',
  report_data JSONB NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ, -- NULL = permanent (logged user), 30d for guest
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_combat_reports_short_code ON combat_reports(short_code);
CREATE INDEX idx_combat_reports_owner ON combat_reports(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_combat_reports_campaign ON combat_reports(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_combat_reports_encounter ON combat_reports(encounter_id) WHERE encounter_id IS NOT NULL;

-- RLS
ALTER TABLE combat_reports ENABLE ROW LEVEL SECURITY;

-- Public read (anyone with the short_code can view the page)
CREATE POLICY "Anyone can read combat reports"
  ON combat_reports FOR SELECT USING (true);

-- Authenticated users can insert (owner_id must match or be null for guest)
CREATE POLICY "Users can insert own reports"
  ON combat_reports FOR INSERT WITH CHECK (
    auth.uid() = owner_id OR owner_id IS NULL
  );

-- Owner can delete their own reports
CREATE POLICY "Users can delete own reports"
  ON combat_reports FOR DELETE USING (auth.uid() = owner_id);
