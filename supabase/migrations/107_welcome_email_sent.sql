-- Migration 107: Add welcome_email_sent flag to user_onboarding
-- Prevents duplicate welcome emails on subsequent logins.

ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN NOT NULL DEFAULT false;
