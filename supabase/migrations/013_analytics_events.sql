-- 013_analytics_events.sql
-- Lightweight event-sourcing table for product analytics
-- No external dependencies (PostHog/Mixpanel) — all data stays in Supabase

CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  properties JSONB DEFAULT '{}',
  page_path TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indices for funnel queries
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_name_created ON analytics_events(event_name, created_at);
CREATE INDEX idx_analytics_events_user_name ON analytics_events(user_id, event_name);
CREATE INDEX idx_analytics_events_anon ON analytics_events(anonymous_id);

-- RLS: admins read, service_role writes
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read analytics events"
  ON public.analytics_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Insert only via service_role (API route uses service_role key)
-- No client-side direct inserts
