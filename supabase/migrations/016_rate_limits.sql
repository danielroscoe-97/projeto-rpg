-- Rate limiting table for serverless-safe rate limiting
-- Replaces in-memory Map that breaks across Vercel instances

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now()
);

-- Atomic rate limit check: increments counter or resets window
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE v_count INTEGER;
BEGIN
  INSERT INTO rate_limits (key, count, window_start)
  VALUES (p_key, 1, now())
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN rate_limits.window_start + (p_window_seconds || ' seconds')::interval < now()
      THEN 1
      ELSE rate_limits.count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start + (p_window_seconds || ' seconds')::interval < now()
      THEN now()
      ELSE rate_limits.window_start
    END
  RETURNING count INTO v_count;
  RETURN v_count <= p_max;
END;
$$ LANGUAGE plpgsql;

-- RLS: only service_role can access (API routes use service_role key)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
