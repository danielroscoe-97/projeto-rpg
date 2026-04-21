-- 165_v_player_sessions_played.sql
-- Epic 04 (Player-as-DM Upsell), Story 04-A, Área 2 (Session Counting).
--
-- Materializes "sessions played as a player" per user, the signal that
-- unlocks the "Virar DM" CTA in the player dashboard (D2 — 2-session
-- threshold).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- Key design decisions (revised after Story 04-A code review)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Why a matview
--   The live query joins sessions × encounters × combatants ×
--   player_characters. Under load every dashboard render would re-do this;
--   a matview refreshed every 15 min is cheap and makes dashboard load
--   shape predictable. Hot-path "just-ended-session" case is handled by a
--   COUNT fallback inside the Story 04-B server action (spec F19), not by
--   this migration.
--
-- Why filter out "draft" encounters
--   `encounters.is_active DEFAULT false` (see 002_session_tables.sql).
--   A row with is_active = false can mean either "encounter ended" OR
--   "encounter was never started" — an orthogonal pair. If we took only
--   `is_active = false` we would count abandoned setups that nobody played
--   (sweep_abandoned_combat_drafts in migration 159 collects session-level
--   drafts but not encounter-level). The `EXISTS combatants.is_defeated`
--   heuristic requires that at least one combatant reached a defeated
--   state — i.e. combat actually resolved. False positives (party fled
--   without defeating anyone) are rare and err on the conservative side
--   of CTA display.
--
-- Why DROP + CREATE on replay (H1)
--   `CREATE MATERIALIZED VIEW IF NOT EXISTS` would silently skip a replay
--   against a stale definition, leaving the old aggregation logic in
--   place. Data is derived, so drop-and-recreate is cheap.
--
-- Why INTEGER cast (H2)
--   COUNT() returns BIGINT in Postgres. PostgREST stringifies BIGINT by
--   default, which would deliver `sessions_played: "2"` instead of
--   `sessions_played: 2` to JS clients — breaking numeric comparisons in
--   the CTA gate. Explicit INTEGER cast keeps the wire shape a JS number.
--
-- Why NO `security_invoker = true` on the wrapper view (C1)
--   The initial draft combined `WITH (security_invoker = true)` with
--   `REVOKE ALL ON matview FROM authenticated`. In PG15+, security_invoker
--   checks BASE-RELATION privileges against the CALLER — meaning the
--   REVOKE would propagate and every authenticated SELECT through the
--   wrapper would raise "permission denied for materialized view". With
--   the default (owner-privileges for view bodies), the view owner
--   (postgres / migration role) has implicit SELECT on the matview, the
--   REVOKE from authenticated still blocks direct access, and the wrapper
--   still filters by `auth.uid()` correctly because auth.uid() resolves
--   against the caller's JWT regardless of security context (it reads the
--   request header, not the session role).
--
-- F2 — Matviews do NOT enforce RLS in Postgres
--   `REVOKE ALL ... FROM authenticated, anon, PUBLIC` still applies and
--   makes the matview inaccessible directly. All public reads go through
--   `my_sessions_played`.
--
-- F12 — JOIN via player_characters.user_id
--   Anon players who upgrade (Story 01-E) have their
--   player_characters.user_id rewritten to the new auth UUID in place.
--   Pre-upgrade sessions re-attribute to the authenticated user on the
--   next matview refresh. Test 11 (see epic spec) locks this down.
--
-- F16 — pg_cron schedule is idempotent
--   Supabase's pg_cron has no UPSERT semantics; reapplying the migration
--   would throw. Delete-then-schedule guarantees clean re-apply. Wrapped
--   in an EXCEPTION handler (M3) so a misconfigured cron schema does not
--   abort the migration — it NOTICEs and continues.
--
-- F17 — CREATE OR REPLACE VIEW
--   Replay-safe wrapper view.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Materialized view (drop + create for replay safety — H1)
-- ─────────────────────────────────────────────────────────────────────────────

DROP MATERIALIZED VIEW IF EXISTS v_player_sessions_played CASCADE;

CREATE MATERIALIZED VIEW v_player_sessions_played AS
SELECT
  pc.user_id,
  COUNT(DISTINCT s.id)::INTEGER AS sessions_played,
  MAX(s.updated_at)             AS last_counted_session_at
FROM player_characters pc
JOIN combatants c       ON c.player_character_id = pc.id
JOIN encounters e       ON e.id = c.encounter_id
JOIN sessions s         ON s.id = e.session_id
WHERE pc.user_id IS NOT NULL
  AND EXISTS (
    -- H4: only count encounters that reached a defeated state — i.e.
    -- combat actually happened. Excludes abandoned setups whose
    -- is_active = false default would otherwise inflate the count.
    SELECT 1 FROM combatants c_def
     WHERE c_def.encounter_id = e.id
       AND c_def.is_defeated = true
  )
GROUP BY pc.user_id;

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE UNIQUE INDEX idx_v_player_sessions_played_user_id
  ON v_player_sessions_played(user_id);

-- F2 — lock direct access. Matviews have no per-row RLS in Postgres.
REVOKE ALL ON v_player_sessions_played FROM authenticated, anon, PUBLIC;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Wrapper view with per-user filter
-- ─────────────────────────────────────────────────────────────────────────────
--
-- NOTE: no `security_invoker = true` (C1 explained above). The view runs
-- with owner privileges against the matview but still filters by
-- `auth.uid()`, which reads the caller's JWT claim.

CREATE OR REPLACE VIEW my_sessions_played AS
SELECT sessions_played, last_counted_session_at
FROM v_player_sessions_played
WHERE user_id = auth.uid();

GRANT SELECT ON my_sessions_played TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. pg_cron refresh every 15 min (idempotent, exception-guarded)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      -- F16: idempotent reschedule.
      DELETE FROM cron.job WHERE jobname = 'refresh_v_player_sessions_played';
      PERFORM cron.schedule(
        'refresh_v_player_sessions_played',
        '*/15 * * * *',
        $cron$REFRESH MATERIALIZED VIEW CONCURRENTLY v_player_sessions_played$cron$
      );
    EXCEPTION WHEN OTHERS THEN
      -- M3: cron schema may not be on search_path even when pg_extension
      -- row exists (Supabase installs the extension under its own schema
      -- and sometimes the migration runner lacks USAGE). Log and continue
      -- rather than abort the whole migration — an operator can schedule
      -- manually from the dashboard.
      RAISE NOTICE 'Could not configure pg_cron job for v_player_sessions_played: %. Schedule manually with cron.schedule(...) from a privileged session.', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'pg_cron extension not enabled — skipping schedule. Enable the extension, then run cron.schedule(...) manually.';
  END IF;
END
$$;

COMMENT ON MATERIALIZED VIEW v_player_sessions_played IS
  'Epic 04 Story 04-A / Área 2: counts completed-combat sessions played as a player per user. '
  'Uses EXISTS combatants.is_defeated as the "combat happened" proxy, avoiding the '
  'is_active = false / never-started ambiguity. Direct access revoked (F2); public reads '
  'must go via my_sessions_played wrapper.';

COMMENT ON VIEW my_sessions_played IS
  'Per-user wrapper over v_player_sessions_played. Runs under view-owner privileges (H1/C1 '
  'explained in migration comments); auth.uid() resolves against the caller''s JWT. '
  'Returns zero rows for users who have never completed a session — consumers must default '
  'to 0.';

-- Backout:
--   DROP VIEW IF EXISTS my_sessions_played;
--   DELETE FROM cron.job WHERE jobname = 'refresh_v_player_sessions_played';
--   DROP MATERIALIZED VIEW IF EXISTS v_player_sessions_played;
