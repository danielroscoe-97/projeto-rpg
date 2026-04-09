-- Migration 111: Add combat_tour_completed to user_onboarding
-- Tracks whether the DM has completed the authenticated combat tour

ALTER TABLE user_onboarding
  ADD COLUMN IF NOT EXISTS combat_tour_completed BOOLEAN NOT NULL DEFAULT FALSE;
