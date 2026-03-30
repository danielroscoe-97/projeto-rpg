-- ============================================================================
-- 040_v2_indexes.sql — Performance indexes for V2 tables
-- Security Hardening Sprint — Story 3
--
-- NOTE: campaign_members indexes already in 033, campaign_invites in 025,
--       player_characters(user_id) in 027. Only NEW indexes below.
-- ============================================================================

-- feature_flags: lookup by flag name
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);

-- homebrew tables: listing by owner
CREATE INDEX IF NOT EXISTS idx_homebrew_monsters_user_id ON homebrew_monsters(user_id);
CREATE INDEX IF NOT EXISTS idx_homebrew_spells_user_id ON homebrew_spells(user_id);
CREATE INDEX IF NOT EXISTS idx_homebrew_items_user_id ON homebrew_items(user_id);

-- combatants: partial index for hidden filtering (broadcast optimization)
CREATE INDEX IF NOT EXISTS idx_combatants_hidden ON combatants(encounter_id, is_hidden) WHERE is_hidden = true;
