-- F08 prod-deploy apply.
-- Mirrors supabase/migrations/188_campaign_settings_srd_full_access.sql
-- Idempotent — safe to re-run if a previous attempt errored mid-statement.

BEGIN;

ALTER TABLE campaign_settings
  ADD COLUMN IF NOT EXISTS srd_full_access BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN campaign_settings.srd_full_access IS
  'When true, players who join this campaign''s combat sessions via /join/[token] receive the full SRD dataset (non-public-SRD content). Set by the Mestre in Campaign HQ Settings. Default false (public SRD only). See docs/glossario-ubiquo.md "SRD Full" for the user-facing concept.';

COMMIT;
