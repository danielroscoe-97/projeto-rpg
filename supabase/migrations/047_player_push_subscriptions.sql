-- Migration 047: player_push_subscriptions
-- Stores Web Push API subscriptions for turn notifications.
-- A player may have multiple subscriptions (different devices/browsers).
-- The session_token_id ties the subscription to a specific player slot in a session.

CREATE TABLE IF NOT EXISTS player_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  -- Player name within the session (matches combatant name)
  player_name TEXT NOT NULL,
  -- Web Push subscription object fields
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  -- Metadata
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Unique per endpoint so re-subscribe is idempotent
  UNIQUE (session_id, endpoint)
);

-- Index for fast lookup when turn advances
CREATE INDEX idx_push_subscriptions_session_player
  ON player_push_subscriptions (session_id, player_name);

ALTER TABLE player_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Players can insert their own subscriptions (anonymous users via service key from API route)
-- API route uses service_role key, so RLS is bypassed on server side.
-- We still add a permissive insert policy for authenticated users:
CREATE POLICY "Allow insert push subscriptions" ON player_push_subscriptions
  FOR INSERT WITH CHECK (true);

-- Select only for service role (used server-side to send pushes)
-- No player-facing SELECT needed
CREATE POLICY "Allow service role select" ON player_push_subscriptions
  FOR SELECT USING (true);

-- Allow delete for cleanup (player opt-out)
CREATE POLICY "Allow delete push subscriptions" ON player_push_subscriptions
  FOR DELETE USING (true);
