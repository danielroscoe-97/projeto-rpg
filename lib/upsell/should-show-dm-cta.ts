"use server";

/**
 * Epic 04 (Player-as-DM Upsell), Story 04-B, Área 1 (CTA trigger logic).
 *
 * Decides whether the "Virar DM" CTA should render on the player dashboard.
 * Combines:
 *   - `users.role`                                     (player / dm / both)
 *   - `getSessionsPlayed(userId)`                      (from migration 165)
 *   - `user_onboarding.first_campaign_created_at`      (from migration 166)
 *
 * Truth table (AC Test 4 — F28 enumeration):
 *   (a) role = player, sessions = 0                           → hidden (below_threshold)
 *   (b) role = player, sessions >= 2, first_campaign NULL     → SHOWN   (shown)
 *   (c) role = both,   sessions = 0                           → hidden (below_threshold)
 *   (d) role = both,   sessions >= 2, first_campaign NULL     → SHOWN   (shown)
 *   (e) role = both,   sessions >= 2, first_campaign SET      → hidden (already_dm)
 *   (f) role = dm,     sessions = anything                    → hidden (already_dm)
 *
 * Any query error → { show: false, reason: 'error', sessionsPlayed: 0 }.
 * Silent fallback keeps the dashboard rendering even if the RPC/view is
 * misconfigured — the CTA just doesn't appear.
 *
 * `reason` codes are stable strings consumed by the API route and (later)
 * analytics. Tests in `tests/upsell/should-show-dm-cta.test.ts` lock the
 * exact string set.
 */

import { createClient } from "@/lib/supabase/server";
import { getSessionsPlayed } from "./get-sessions-played";

const SESSIONS_THRESHOLD = 2; // D2 — 2 sessions played

export type DmCtaReason =
  | "shown"
  | "below_threshold"
  | "already_dm"
  | "error";

export interface DmCtaDecision {
  show: boolean;
  reason: DmCtaReason;
  sessionsPlayed: number;
}

export async function shouldShowDmCta(userId: string): Promise<DmCtaDecision> {
  if (!userId || typeof userId !== "string") {
    return { show: false, reason: "error", sessionsPlayed: 0 };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return { show: false, reason: "error", sessionsPlayed: 0 };
  }

  // Role lookup — cheapest gate, short-circuit (f).
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (userError || !userRow) {
    return { show: false, reason: "error", sessionsPlayed: 0 };
  }

  const role = userRow.role;

  // (f) Pure DM → already a DM, never show upsell.
  if (role === "dm") {
    // Zero'd sessionsPlayed because we didn't read it (cheaper path).
    return { show: false, reason: "already_dm", sessionsPlayed: 0 };
  }

  // (e) "both" role that already created a campaign → already a DM by all
  // meaningful measures even if the role label lingers as "both" from a
  // prior role flip. Check BEFORE reading sessions so the sessions query
  // doesn't gate the exit.
  //
  // NOTE: we only need this check for role === "both". "player" users
  // wouldn't have a campaign (role is set to "both" in Story 04-F when
  // they create one — this state is effectively unreachable for pure
  // players), so skip the fetch to save a round trip.
  if (role === "both") {
    const { data: onboarding, error: onboardingError } = await supabase
      .from("user_onboarding")
      .select("first_campaign_created_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (onboardingError) {
      return { show: false, reason: "error", sessionsPlayed: 0 };
    }
    if (onboarding?.first_campaign_created_at !== null && onboarding?.first_campaign_created_at !== undefined) {
      // (e) already crossed into DM — suppress regardless of sessions.
      return { show: false, reason: "already_dm", sessionsPlayed: 0 };
    }
  }

  // Sessions gate — same threshold for both "player" and "both".
  const sessionsPlayed = await getSessionsPlayed(userId);

  if (sessionsPlayed < SESSIONS_THRESHOLD) {
    // (a) / (c)
    return { show: false, reason: "below_threshold", sessionsPlayed };
  }

  // (b) / (d)
  return { show: true, reason: "shown", sessionsPlayed };
}
