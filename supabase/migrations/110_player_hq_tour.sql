-- Migration 110: Add player_hq_tour_completed to user_onboarding
-- Tracks whether the player has completed the Player HQ first-time tour

ALTER TABLE user_onboarding
  ADD COLUMN IF NOT EXISTS player_hq_tour_completed BOOLEAN NOT NULL DEFAULT FALSE;
