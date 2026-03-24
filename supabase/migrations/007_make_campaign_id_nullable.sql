-- 006_make_campaign_id_nullable.sql
-- Allow sessions to be created without a campaign (quick encounters, Epic 3).
-- Campaign-linked sessions (Epic 2) still set campaign_id.

ALTER TABLE sessions
  ALTER COLUMN campaign_id DROP NOT NULL;
