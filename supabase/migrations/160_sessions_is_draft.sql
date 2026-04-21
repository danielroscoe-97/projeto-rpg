-- 160_sessions_is_draft.sql
-- Epic 12, Story 12.2 AC3 — explicit draft marker on `sessions`.
--
-- Before this, the code inferred "draft = session without any encounters". That
-- worked for the sweeper but was fragile for analytics and listing queries
-- (any future code creating a session for another reason would show up as a
-- draft). Making the signal explicit lets the UI cleanly hide drafts from
-- the campaign history while the 72h sweeper targets them directly.
--
-- Backfill: existing rows are not drafts by definition (they all have encounters
-- or were part of previous flows that graduated). Default is `false`. The
-- `createSessionOnly` helper explicitly sets `true` when called eagerly from
-- the setup page; `createEncounterWithCombatants` flips it back to `false` on
-- the transition to a real combat.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;

-- Partial index — queries only ever filter for drafts (sweeper, dashboard hiding),
-- so a partial index is cheaper than covering every row.
CREATE INDEX IF NOT EXISTS idx_sessions_drafts_by_age
  ON sessions (created_at)
  WHERE is_draft = true;

COMMENT ON COLUMN sessions.is_draft IS
  'Epic 12 Story 12.2 — true while the DM is still in the setup screen (no encounter yet). Flipped to false on Start Combat. Drafts older than 72h are reaped by sweep_abandoned_combat_drafts().';
