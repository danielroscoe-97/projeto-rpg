-- ============================================================================
-- 040_v2_indexes.sql — Performance indexes for V2 tables
-- Security Hardening Sprint — Story 3
-- ============================================================================

-- campaign_members indexes
CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign_id ON campaign_members(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_members_user_id ON campaign_members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_members_unique ON campaign_members(campaign_id, user_id);

-- campaign_invites indexes
CREATE INDEX IF NOT EXISTS idx_campaign_invites_campaign_id ON campaign_invites(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_invites_token ON campaign_invites(token);
CREATE INDEX IF NOT EXISTS idx_campaign_invites_email ON campaign_invites(email);

-- homebrew index
CREATE INDEX IF NOT EXISTS idx_homebrew_user_id ON homebrew(user_id);

-- feature_flags index
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);

-- player_characters partial index
CREATE INDEX IF NOT EXISTS idx_player_characters_user_id ON player_characters(user_id) WHERE user_id IS NOT NULL;

-- combatants partial index for hidden filtering
CREATE INDEX IF NOT EXISTS idx_combatants_hidden ON combatants(encounter_id, is_hidden) WHERE is_hidden = true;
