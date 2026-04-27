-- F08 — Campaign-level SRD Full access toggle
--
-- When enabled, players who join this campaign's sessions via /join/[token]
-- receive the full SRD dataset (including non-public-SRD content like
-- monsters and spells from supplements covered by Pocket DM's data licence)
-- through SrdInitializer fullData={true}. The Mestre toggles this in
-- Campaign HQ Settings; the default stays false to preserve the existing
-- public-SRD-only experience.
--
-- The /api/srd/full/* auth gate is NOT bypassed by this flag — it remains
-- the primary defense. This flag only flips the client-side data source
-- between /srd/ (public) and /api/srd/full/ (auth-gated) for joined
-- players, so the Mestre can deliberately broaden their table's reach
-- without exposing the data publicly.

ALTER TABLE campaign_settings
  ADD COLUMN IF NOT EXISTS srd_full_access BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN campaign_settings.srd_full_access IS
  'When true, players who join this campaign''s combat sessions via /join/[token] receive the full SRD dataset (non-public-SRD content). Set by the Mestre in Campaign HQ Settings. Default false (public SRD only). See docs/glossario-ubiquo.md "SRD Full" for the user-facing concept.';
