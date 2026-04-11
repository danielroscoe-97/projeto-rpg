-- 128_error_logs.sql
-- Client-side and server-side error tracking table
-- Dual-write: errors go to both Sentry (triaging) and here (owned data, dashboards)

CREATE TABLE public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL DEFAULT 'error' CHECK (level IN ('error', 'warning', 'info')),
  message TEXT NOT NULL,
  stack TEXT,
  component TEXT,
  action TEXT,
  category TEXT,
  url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_mode TEXT CHECK (session_mode IN ('guest', 'anon', 'auth')),
  fingerprint TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Performance indices for dashboard queries
CREATE INDEX idx_error_logs_created ON error_logs(created_at);
CREATE INDEX idx_error_logs_level ON error_logs(level);
CREATE INDEX idx_error_logs_category ON error_logs(category);
CREATE INDEX idx_error_logs_fingerprint ON error_logs(fingerprint);
CREATE INDEX idx_error_logs_user ON error_logs(user_id);
CREATE INDEX idx_error_logs_level_created ON error_logs(level, created_at);
CREATE INDEX idx_error_logs_component ON error_logs(component);

-- RLS: admins read, service_role writes (same pattern as analytics_events)
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read error logs"
  ON public.error_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Auto-cleanup: delete error logs older than 90 days (run via pg_cron or manual)
-- SELECT cron.schedule('cleanup-error-logs', '0 3 * * 0', $$DELETE FROM error_logs WHERE created_at < now() - interval '90 days'$$);
