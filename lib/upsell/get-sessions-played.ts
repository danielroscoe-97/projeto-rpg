"use server";

/**
 * Epic 04 (Player-as-DM Upsell), Story 04-B, Área 2 (Session Counting).
 *
 * Returns the number of sessions the authenticated user has played AS A PLAYER
 * (not as a DM). The signal that unlocks the "Virar DM" CTA in the player
 * dashboard once it reaches D2 (2 sessions). See Story 04-A migration 165
 * (`v_player_sessions_played` + `my_sessions_played`) for the matview/wrapper.
 *
 * Primary read: `my_sessions_played` wrapper view (cookie-aware; `auth.uid()`
 * resolves against the caller's JWT).
 *
 * F19 — Hot-path fallback (⚠️ currently dormant — see Sprint 2 TODO)
 * ================================================================
 * The matview refreshes every 15 min via pg_cron. That leaves a window where a
 * user just finished a session and lands on the dashboard: `my_sessions_played`
 * would still be "2" when it should be "3", and the CTA would suppress one
 * render longer than it should. The intended closure is:
 *
 *   1. Read the wrapper view (always).
 *   2. If the matview's `last_counted_session_at` is older than 5 min AND
 *      `users.last_session_at` is STRICTLY newer than `last_counted_session_at`,
 *      we know the matview is stale for THIS user specifically.
 *   3. Issue a live COUNT that mirrors migration 165's WHERE clause.
 *
 * **REALITY CHECK** — adversarial re-review (Apr 21, 2026) found that
 * `users.last_session_at` is written in exactly ONE place today:
 * `lib/supabase/player-identity.ts:544` (anon→auth upgrade finalizer).
 * Combat flows do NOT update it. After a user's first upgrade the column
 * is effectively frozen, so in production the `userNewer` gate is never
 * true and the live-COUNT pipeline below is unreachable. The matview
 * IS the source of truth.
 *
 * We keep the pipeline (instead of deleting) because:
 *   - Unit tests exercise it (they synthesize `last_session_at`).
 *   - Wiring up `last_session_at` on encounter-close is a one-liner
 *     deferred to Sprint 2. Once it lands, F19 becomes live again with
 *     zero other edits here.
 *   - The H4 monotonicity guard (Math.max) is still a useful safety net
 *     the day `last_session_at` starts updating.
 *
 * If you're reading this comment and `last_session_at` is still only
 * written by Epic 01, the 15-min lag is the real CTA cadence. Live with
 * it, or ship the Sprint 2 TODO.
 *
 * Return contract
 * ===============
 * - Happy path → `sessions_played` from the matview (or live COUNT on the
 *   F19 fallback path).
 * - Zero rows from `my_sessions_played` → returns `0`. Migration 165's
 *   wrapper view emits zero rows for users who have never completed a
 *   session; this is the expected "new user" path.
 * - Any error (query timeout, RLS misconfigured, matview missing, etc.) →
 *   returns `0`. The CTA just won't show — better than crashing the
 *   dashboard for a cosmetic gate.
 */

import { createClient } from "@/lib/supabase/server";

/** How old the matview can get before we consider the hot-path fallback. */
const MATVIEW_STALE_MS = 5 * 60 * 1000;

/**
 * Defensive cap on the number of rows each intermediate SELECT in the F19
 * fallback pipeline will fetch. Shielding against two failure modes:
 *
 *   1. PostgREST URL length limits (~8 KB default). A high-play user with
 *      thousands of player_characters × hundreds of combatants/PC can
 *      produce an `.in("encounter_id", […])` clause that either 414s or
 *      silently truncates server-side. Bounding each SELECT at
 *      FALLBACK_ROW_LIMIT gives us a deterministic failure edge.
 *   2. Memory: we materialize each intermediate list into a Set, so the
 *      worst case is 4 × cap rows in memory per request.
 *
 * If ANY stage hits the cap, we give up on the live path and return the
 * matview snapshot (see H5). The matview value is authoritative for
 * monotonicity (H4) anyway — better to land on the cron-lagged number
 * than on a silently-truncated live COUNT.
 */
const FALLBACK_ROW_LIMIT = 10_000;

export async function getSessionsPlayed(userId: string): Promise<number> {
  if (!userId || typeof userId !== "string") return 0;

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return 0;
  }

  // ── 1. Primary read: wrapper view ────────────────────────────────────────
  const { data: matview, error: matviewError } = await supabase
    .from("my_sessions_played")
    .select("sessions_played, last_counted_session_at")
    .maybeSingle();

  if (matviewError) {
    // Silent fallback — the CTA suppresses itself.
    return 0;
  }

  // Zero rows = user has never completed a session (per migration 165 comment).
  if (!matview) return 0;

  // ── 2. Hot-path staleness check (F19) ────────────────────────────────────
  // Both conditions must hold: matview older than 5 min AND a user-level
  // session activity newer than the matview's latest counted row.
  const lastCountedAt = matview.last_counted_session_at
    ? new Date(matview.last_counted_session_at).getTime()
    : null;
  const matviewStale =
    lastCountedAt !== null && Date.now() - lastCountedAt > MATVIEW_STALE_MS;

  if (!matviewStale) {
    return matview.sessions_played ?? 0;
  }

  // Matview is stale — check whether THIS user has newer activity.
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("last_session_at")
    .eq("id", userId)
    .maybeSingle();

  if (userError || !userRow?.last_session_at) {
    return matview.sessions_played ?? 0;
  }

  const userLastSessionMs = new Date(userRow.last_session_at).getTime();
  const userNewer =
    lastCountedAt !== null && userLastSessionMs > lastCountedAt;

  if (!userNewer) {
    return matview.sessions_played ?? 0;
  }

  // ── 3. F19 live COUNT fallback ───────────────────────────────────────────
  // Mirror migration 165's WHERE clause. Pipeline (because PostgREST cannot
  // express a 4-way join + correlated EXISTS in a single rest call):
  //   (a) pc ids for this user
  //   (b) combatants pointing at those pcs (these carry encounter_ids)
  //   (c) combatants that are is_defeated=true across THOSE encounter_ids
  //       (the EXISTS proxy in migration 165 — "combat actually happened")
  //   (d) distinct session_ids across those encounters
  //
  // Each stage is capped at FALLBACK_ROW_LIMIT (H5 — defensive against
  // URL-length blowups). If ANY stage hits the cap, we abort the live
  // path and return the matview snapshot (the matview in Postgres doesn't
  // have the URL-length limitation).
  //
  // Monotonicity (H4): the final return is wrapped in Math.max(matviewCount,
  // liveCount). The live pipeline can legitimately undercount the matview
  // when historical combatants have been soft-deleted or when a pc's
  // user_id was rewritten backwards by an admin op. Returning less than
  // the matview would flip the CTA back off after a user just crossed
  // the 2-session threshold — a worse UX than "count is briefly stale
  // but monotone".
  const matviewCount = matview.sessions_played ?? 0;
  try {
    const { data: pcRows, error: pcError } = await supabase
      .from("player_characters")
      .select("id")
      .eq("user_id", userId)
      .limit(FALLBACK_ROW_LIMIT);
    if (
      pcError ||
      !pcRows ||
      pcRows.length === 0 ||
      pcRows.length >= FALLBACK_ROW_LIMIT
    ) {
      return matviewCount;
    }
    const pcIds = pcRows.map((r) => r.id);

    const { data: myCombatants, error: myCombatantsError } = await supabase
      .from("combatants")
      .select("encounter_id")
      .in("player_character_id", pcIds)
      .limit(FALLBACK_ROW_LIMIT);
    if (
      myCombatantsError ||
      !myCombatants ||
      myCombatants.length === 0 ||
      myCombatants.length >= FALLBACK_ROW_LIMIT
    ) {
      return matviewCount;
    }
    // Deduplicate encounter ids from this user's combatants. NOT YET filtered
    // by the "combat happened" proxy — that's the next step.
    const candidateEncounterIds = Array.from(
      new Set(
        myCombatants
          .map((c) => c.encounter_id)
          .filter((v): v is string => typeof v === "string"),
      ),
    );
    if (
      candidateEncounterIds.length === 0 ||
      candidateEncounterIds.length >= FALLBACK_ROW_LIMIT
    ) {
      return matviewCount;
    }

    // "EXISTS (SELECT 1 FROM combatants WHERE encounter_id = e.id AND
    //  is_defeated = true)" — implement by pulling defeated combatants
    // within the candidate set and intersecting their encounter_ids.
    const { data: defeated, error: defeatedError } = await supabase
      .from("combatants")
      .select("encounter_id")
      .in("encounter_id", candidateEncounterIds)
      .eq("is_defeated", true)
      .limit(FALLBACK_ROW_LIMIT);
    if (
      defeatedError ||
      !defeated ||
      defeated.length === 0 ||
      defeated.length >= FALLBACK_ROW_LIMIT
    ) {
      return matviewCount;
    }
    const playedEncounterIds = Array.from(
      new Set(
        defeated
          .map((c) => c.encounter_id)
          .filter((v): v is string => typeof v === "string"),
      ),
    );
    if (
      playedEncounterIds.length === 0 ||
      playedEncounterIds.length >= FALLBACK_ROW_LIMIT
    ) {
      return matviewCount;
    }

    // Finally, count DISTINCT session_ids reached through those encounters.
    const { data: encRows, error: encError } = await supabase
      .from("encounters")
      .select("session_id")
      .in("id", playedEncounterIds)
      .limit(FALLBACK_ROW_LIMIT);
    if (
      encError ||
      !encRows ||
      encRows.length >= FALLBACK_ROW_LIMIT
    ) {
      return matviewCount;
    }
    const sessionIds = new Set(
      encRows
        .map((e) => e.session_id)
        .filter((v): v is string => typeof v === "string"),
    );
    // H4 — monotone: never return LESS than the matview says.
    return Math.max(matviewCount, sessionIds.size);
  } catch {
    return matviewCount;
  }
}
