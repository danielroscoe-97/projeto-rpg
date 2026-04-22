-- 178_encounter_end_writes_last_session_at.sql
-- Epic 04 Sprint 2 — F19-WIRE.
--
-- Story 04-I prereq. Fixes Sprint 1 re-review finding that
-- `users.last_session_at` is written in exactly ONE place today
-- (`lib/supabase/player-identity.ts:544`, the anon→auth upgrade finalizer),
-- leaving the F19 hot-path fallback in `lib/upsell/get-sessions-played.ts`
-- effectively dormant.
--
-- Why this matters
-- ────────────────
-- The DM-upsell CTA's gate reads `my_sessions_played` (matview refreshed
-- every 15 min via pg_cron). F19 was designed to mask the refresh lag by
-- running a live COUNT when the user has JUST finished a session:
--
--   if (users.last_session_at > matview.last_counted_session_at)
--     run live COUNT
--
-- In prod through Sprint 1 the left side never advanced, so the right side
-- was never stale relative to it — hot-path never fired, CTA lag of up to
-- 15 min was the real cadence.
--
-- This migration wires `users.last_session_at` to update AFTER the DM
-- ends an encounter (transition of `encounters.ended_at` from NULL →
-- NOT NULL). For every `player_character` bound to the encounter via
-- `combatants.player_character_id` that has a non-NULL `user_id`, the
-- user's `last_session_at` is bumped to the encounter's `ended_at`.
--
-- Design choices
-- ──────────────
-- * Trigger is SERVER-SIDE — works regardless of which client closed the
--   encounter (DM desktop app, future server action, admin cleanup).
--   An app-layer 1-liner in `CombatSessionClient.tsx` would miss any
--   non-client flow.
-- * AFTER UPDATE, not BEFORE — `ended_at` must actually be committed
--   before we propagate. An abort from a deeper trigger would leave
--   `users` inconsistent with `encounters`.
-- * Fires ONLY on the NULL → NOT NULL transition — re-opening and re-
--   closing an encounter (not a flow that exists today but might appear
--   with combat-retry features) would otherwise spam the users table.
--   Protected by `OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL`.
-- * Uses `NEW.ended_at`, not `now()` — keeps `users.last_session_at`
--   aligned with the encounter's authoritative clock. If the client
--   back-dated `ended_at` (it shouldn't, but defense-in-depth) we
--   propagate that value rather than the trigger-firing timestamp.
-- * SECURITY DEFINER — `authenticated` role (DM closing an encounter)
--   does NOT have UPDATE on `public.users` (RLS policy `users_update_own`
--   at migration 005 gates it to self-updates only). Running the trigger
--   as the table owner bypasses RLS and works for any closer.
-- * `SET search_path = pg_catalog, public, pg_temp` — standard hardening
--   for SECURITY DEFINER; prevents search-path hijack if an extension
--   later creates a `public.users` shadow (same posture as migrations
--   151, 165, 170, 174, 176).
-- * No-op on encounter-close that has zero player-characters (solo DM
--   tests, NPC-only encounters): the inner UPDATE simply touches zero
--   rows.
-- * Idempotency on replay: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF
--   EXISTS + CREATE TRIGGER. Safe to run twice.
--
-- Read order (migrations README): prereq of 04-I analytics funnel. See
-- `supabase/migrations/README.md` → Epic 04 Sprint 2 chain.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Trigger function
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION propagate_encounter_end_to_last_session_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  -- Gate: only the NULL → NOT NULL transition. Prevents spam on subsequent
  -- updates of the same encounter (e.g. name edits after closing).
  IF OLD.ended_at IS NOT NULL OR NEW.ended_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- For every player_character bound to this encounter via combatants,
  -- bump the owning user's last_session_at. Using a single SQL UPDATE
  -- with a subselect avoids a PL/pgSQL loop for the common (party of 4)
  -- case where it's <10 rows anyway.
  --
  -- NOTE on NPC combatants: `combatants.player_character_id` is nullable
  -- (002_session_tables.sql:53) — NPC / monster rows are filtered by the
  -- IS NOT NULL check on pc.user_id below, so no spurious users.last
  -- _session_at writes.
  UPDATE users u
  SET last_session_at = NEW.ended_at
  FROM combatants c
  JOIN player_characters pc ON pc.id = c.player_character_id
  WHERE c.encounter_id = NEW.id
    AND pc.user_id = u.id
    AND pc.user_id IS NOT NULL
    AND (u.last_session_at IS NULL OR u.last_session_at < NEW.ended_at);
  -- Monotonic guard on last_session_at — an admin replaying an old
  -- encounter (ended_at back-dated) must not rewind a user's clock.
  -- Pairs with the H4 monotonicity contract in get-sessions-played.ts.

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION propagate_encounter_end_to_last_session_at() IS
  'Epic 04 Sprint 2 F19-WIRE (migration 178): AFTER UPDATE OF ended_at trigger '
  'on encounters. When an encounter transitions NULL → NOT NULL, bumps '
  'users.last_session_at for every player_character bound to the encounter '
  'via combatants. Makes the F19 hot-path fallback in lib/upsell/get-sessions-'
  'played.ts live (dormant through Sprint 1 because last_session_at was only '
  'written by the anon→auth upgrade finalizer). SECURITY DEFINER because '
  'authenticated lacks UPDATE on users (RLS users_update_own is self-only).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Trigger
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_encounter_end_propagates_last_session_at ON encounters;

CREATE TRIGGER trg_encounter_end_propagates_last_session_at
  AFTER UPDATE OF ended_at ON encounters
  FOR EACH ROW
  WHEN (OLD.ended_at IS DISTINCT FROM NEW.ended_at)
  EXECUTE FUNCTION propagate_encounter_end_to_last_session_at();

COMMENT ON TRIGGER trg_encounter_end_propagates_last_session_at ON encounters IS
  'Epic 04 Sprint 2 F19-WIRE: fires on NULL → NOT NULL transition of '
  'encounters.ended_at. Row-level WHEN clause drops no-op updates before '
  'function entry. See migration 178 + lib/upsell/get-sessions-played.ts.';

-- Backout:
--   DROP TRIGGER IF EXISTS trg_encounter_end_propagates_last_session_at ON encounters;
--   DROP FUNCTION IF EXISTS propagate_encounter_end_to_last_session_at();
