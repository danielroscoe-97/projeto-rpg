-- Migration 078: Add 'returning_no_campaign' to user_onboarding source CHECK constraint
-- Fixes mismatch between TypeScript type and DB constraint

ALTER TABLE user_onboarding
  DROP CONSTRAINT IF EXISTS user_onboarding_source_check;

ALTER TABLE user_onboarding
  ADD CONSTRAINT user_onboarding_source_check
  CHECK (source IN ('fresh', 'guest_combat', 'guest_browse', 'returning_no_campaign'));
