-- ============================================================================
-- 136: Encounter Recap Snapshot
-- Persists the end-of-combat "Wrapped" recap on the encounter row so players
-- who reconnect after the DM closes combat can still see it.
--
-- Spike: docs/spike-beta-test-3-2026-04-17.md (Finding 1)
-- Sprint: S1.1 — Track A / Dev A (feat/beta3-recap-persistence)
--
-- Design notes:
--   * Single source of truth per encounter (1-to-1 with encounter row), so we
--     simply add a nullable JSONB column instead of creating a new table.
--   * Broadcast delivery (Supabase Realtime) stays as the "happy path"; this
--     column is the durable fallback the player GET endpoint reads.
--   * TTL is enforced at read time via `ended_at > now() - 24h` in the GET
--     endpoint (keeps the policy co-located with the API, not the schema).
--   * Idempotent: uses IF NOT EXISTS so re-applying the migration is a no-op.
-- ============================================================================

ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS recap_snapshot JSONB;

COMMENT ON COLUMN encounters.recap_snapshot IS
  'Player-safe CombatReport persisted by the DM when combat ends. NULL until the DM closes combat. Served by GET /api/session/[id]/latest-recap within 24h of ended_at.';
