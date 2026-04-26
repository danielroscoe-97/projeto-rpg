-- Migration: combat_events journal table
-- Story: CR-02 (Estabilidade Combate, Sprint 1) — server-authoritative event journal
-- Critical fix: Caminho A from PR #59 review (2026-04-26).
--
-- Why: original CR-02 used an in-memory Map module-level. Failed because
-- recordEvent ran in the DM browser while getEventsSince ran in the
-- serverless function — separate runtimes, separate Maps. Resume always
-- returned empty. Move the journal to Postgres so all runtimes share state.
--
-- Schema notes:
--   - bigserial seq is GLOBAL (not per-session). Seq numbers are monotonic
--     within a session via INSERT serialization (Postgres locks on PK +
--     unique constraint). Gaps in per-session seq are expected when other
--     sessions interleave; clients only do `seq > since_seq` comparisons,
--     which preserves ordering correctly.
--   - JSONB event payload — already sanitized server-side per /api/broadcast
--     route; storing as-is so resume returns identical wire format.
--   - Per-session cap of 100 events enforced via trigger (matches original
--     in-memory MVP semantics + tech spec D2 §5).
--   - No FK to sessions(id) ON DELETE CASCADE — we want events to outlive
--     deleted sessions briefly to avoid race when DM ends a session and a
--     straggler player tries to resume. Cleanup via the per-session cap +
--     a separate periodic cleanup job (next migration if needed).

CREATE TABLE IF NOT EXISTS combat_events (
  seq          BIGSERIAL    PRIMARY KEY,
  session_id   UUID         NOT NULL,
  event_type   TEXT         NOT NULL,
  event        JSONB        NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Resume queries hit (session_id, seq) range; this index is the hot path.
CREATE INDEX IF NOT EXISTS idx_combat_events_session_seq
  ON combat_events (session_id, seq DESC);

-- Cleanup queries hit (session_id, created_at); useful for time-based purge.
CREATE INDEX IF NOT EXISTS idx_combat_events_session_created
  ON combat_events (session_id, created_at DESC);

-- ── Per-session cap trigger ──────────────────────────────────────────
-- After every INSERT, prune entries older than the most recent 100 for
-- the same session_id. Matches the original in-memory ring buffer
-- semantics (BUFFER_CAP = 100 from event-journal.ts).
--
-- This runs on every insert which adds modest write overhead; for our
-- traffic levels (low tens of events/min per session) it is fine. If
-- this becomes hot, batch the cleanup via a periodic job.

CREATE OR REPLACE FUNCTION trim_combat_events_per_session()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM combat_events
   WHERE session_id = NEW.session_id
     AND seq <= (
       SELECT seq FROM combat_events
        WHERE session_id = NEW.session_id
        ORDER BY seq DESC
        OFFSET 100 LIMIT 1
     );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trim_combat_events_after_insert ON combat_events;
CREATE TRIGGER trim_combat_events_after_insert
AFTER INSERT ON combat_events
FOR EACH ROW
EXECUTE FUNCTION trim_combat_events_per_session();

-- ── RLS ──────────────────────────────────────────────────────────────
-- combat_events is exclusively accessed via service-role:
--   - INSERT: /api/broadcast (server-only, after auth + ownership checks)
--   - SELECT: /api/combat/[id]/events (server-only, after token validation)
-- Direct client access is not supported. RLS denies everything else.

ALTER TABLE combat_events ENABLE ROW LEVEL SECURITY;

-- No policies = deny all by default. Service-role bypasses RLS.

-- ── Comments ─────────────────────────────────────────────────────────
COMMENT ON TABLE combat_events IS
  'Append-only journal of broadcast events per session. Used for client-side resume on reconnect (Estabilidade Combate sprint, CR-02). Trimmed to 100 most-recent events per session via trigger.';

COMMENT ON COLUMN combat_events.seq IS
  'Global monotonic sequence (bigserial). Per-session ordering preserved via INSERT serialization; gaps in per-session view are expected and benign — clients use seq > since_seq comparison only.';

COMMENT ON COLUMN combat_events.event IS
  'Sanitized event payload (anti-metagaming gate has already run before insert). Stored as JSONB so the resume endpoint returns identical wire format.';
