-- Migration 046: user_onboarding tracking table
-- Tracks onboarding state per user: wizard_completed, dashboard_tour_completed, source

CREATE TABLE IF NOT EXISTS user_onboarding (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'fresh'
    CHECK (source IN ('fresh', 'guest_combat', 'guest_browse')),
  wizard_completed BOOLEAN NOT NULL DEFAULT false,
  wizard_step TEXT DEFAULT NULL,
  dashboard_tour_completed BOOLEAN NOT NULL DEFAULT false,
  guest_data_migrated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own onboarding" ON user_onboarding
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own onboarding" ON user_onboarding
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users insert own onboarding" ON user_onboarding
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Auto-create onboarding row on user registration
CREATE OR REPLACE FUNCTION create_user_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_onboarding (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_onboarding ON auth.users;
CREATE TRIGGER on_auth_user_created_onboarding
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_onboarding();

-- updated_at auto-update
CREATE OR REPLACE FUNCTION update_user_onboarding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_onboarding_updated_at ON user_onboarding;
CREATE TRIGGER user_onboarding_updated_at
  BEFORE UPDATE ON user_onboarding
  FOR EACH ROW EXECUTE FUNCTION update_user_onboarding_timestamp();

-- Backfill existing users
-- Users WITH campaigns: wizard done, tour pending
INSERT INTO user_onboarding (user_id, source, wizard_completed, dashboard_tour_completed)
SELECT u.id, 'fresh', true, false FROM auth.users u
WHERE EXISTS (SELECT 1 FROM campaigns c WHERE c.owner_id = u.id)
ON CONFLICT DO NOTHING;

-- Users WITHOUT campaigns: everything pending
INSERT INTO user_onboarding (user_id, source, wizard_completed, dashboard_tour_completed)
SELECT u.id, 'fresh', false, false FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM campaigns c WHERE c.owner_id = u.id)
ON CONFLICT DO NOTHING;
