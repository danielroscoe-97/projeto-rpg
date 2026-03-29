-- 034_seed_existing_memberships.sql
-- Story A.2: Seed campaign_members for all existing data.
-- Backfills DM memberships from campaigns.owner_id and player memberships
-- from player_characters.user_id. Idempotent via ON CONFLICT DO NOTHING.

-- ============================================================
-- Seed DMs: every campaign owner becomes a 'dm' member
-- ============================================================
INSERT INTO campaign_members (campaign_id, user_id, role, status)
SELECT id, owner_id, 'dm', 'active'
FROM campaigns
ON CONFLICT (campaign_id, user_id) DO NOTHING;

-- ============================================================
-- Seed Players: every player_character with a user_id becomes a 'player' member
-- ============================================================
INSERT INTO campaign_members (campaign_id, user_id, role, status)
SELECT DISTINCT campaign_id, user_id, 'player', 'active'
FROM player_characters
WHERE user_id IS NOT NULL
ON CONFLICT (campaign_id, user_id) DO NOTHING;
