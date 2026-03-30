-- Analytics daily aggregation table
-- Used by background job to store pre-computed metrics for fast dashboard queries

CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  dau INTEGER DEFAULT 0,
  sessions_created INTEGER DEFAULT 0,
  combats_started INTEGER DEFAULT 0,
  players_joined INTEGER DEFAULT 0,
  signups INTEGER DEFAULT 0,
  guest_conversions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(date);

-- RLS: only admins can read/write analytics_daily
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read analytics_daily" ON analytics_daily
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Service role can insert analytics_daily" ON analytics_daily
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update analytics_daily" ON analytics_daily
  FOR UPDATE USING (true);
