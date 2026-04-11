-- Fix: session_number race condition — add UNIQUE constraint per campaign
ALTER TABLE sessions
  ADD CONSTRAINT sessions_campaign_session_number_unique
  UNIQUE (campaign_id, session_number);

-- Fix: remove duplicate description column from campaign_settings
-- (canonical description lives on campaigns.description)
ALTER TABLE campaign_settings DROP COLUMN IF EXISTS description;
