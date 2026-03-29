-- 039_campaigns_join_code.sql
-- Story A.7: Add join code support to campaigns for invite-by-link flow.
-- join_code is a short alphanumeric code (e.g. "AB12CD") that can be shared
-- as a link (/join-campaign/[code]). DM can activate/deactivate and regenerate.
-- max_players limits the number of members who can join via code.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS join_code_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 10;

-- Fast lookup by join_code (partial index — only non-null codes)
CREATE INDEX IF NOT EXISTS idx_campaigns_join_code
  ON campaigns(join_code) WHERE join_code IS NOT NULL;
