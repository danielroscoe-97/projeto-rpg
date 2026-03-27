-- Migration 017: Subscriptions table for monetization (Epic 5, Story 5.4)
-- Supports free, pro, mesa plans with trial support

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'mesa')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'canceled', 'past_due')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role (webhooks) can do anything via service key (bypasses RLS)

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Atomic trial activation (prevents race condition — only first concurrent request wins)
CREATE OR REPLACE FUNCTION activate_trial(p_user_id UUID, p_trial_ends_at TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  -- Try to insert new subscription with trial
  INSERT INTO subscriptions (user_id, plan, status, trial_ends_at)
  VALUES (p_user_id, 'pro', 'trialing', p_trial_ends_at)
  ON CONFLICT (user_id) DO UPDATE
    SET plan = 'pro',
        status = 'trialing',
        trial_ends_at = p_trial_ends_at
    WHERE subscriptions.trial_ends_at IS NULL;

  -- If a row was affected, trial was activated
  GET DIAGNOSTICS v_result = ROW_COUNT;
  RETURN v_result > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
