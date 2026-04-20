import type { User } from "@supabase/supabase-js";
import { createServiceClient, getAuthUser } from "@/lib/supabase/server";

/**
 * Minimal `session_tokens` row shape the `/join/[token]` UI needs. We
 * deliberately do NOT return the raw DB row — PlayerJoinClient should
 * consume a stable contract rather than tracking DB column churn.
 */
export interface SessionTokenSummary {
  id: string;
  sessionId: string;
  token: string;
  playerName: string | null;
  anonUserId: string | null;
  userId: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
}

/**
 * Minimal `sessions` row shape. Only the fields that state-detection needs
 * to make branching decisions (is_active) or that the UI reuses in the
 * welcome-back banner.
 */
export interface JoinSessionSummary {
  id: string;
  name: string;
  isActive: boolean;
  campaignId: string | null;
  rulesetVersion: string;
  dmPlan: string;
}

/**
 * Discriminated union returned by `detectJoinState`.
 *
 * Each branch carries the minimum data `/join/[token]` needs:
 *   - `invalid`         — error screen (not_found / expired / session_ended)
 *   - `fresh`           — first-time access, no anon/auth identity yet
 *   - `returning-anon`  — session_token already bound to an anon identity,
 *                         caller is either the same anon or presenting a new
 *                         cookie (see "anon cookie mismatch" note below)
 *   - `returning-auth`  — session_token has been promoted to an auth user
 *                         (post-Story 01-B via `session_tokens.user_id`)
 */
export type JoinState =
  | { state: "invalid"; reason: "not_found" | "expired" | "session_ended" }
  | { state: "fresh"; sessionToken: SessionTokenSummary; session: JoinSessionSummary }
  | {
      state: "returning-anon";
      sessionToken: SessionTokenSummary;
      session: JoinSessionSummary;
    }
  | {
      state: "returning-auth";
      sessionToken: SessionTokenSummary;
      session: JoinSessionSummary;
      user: User;
    };

/**
 * Detect the state of a `/join/[token]` page.
 *
 * Reads `session_tokens` + `sessions` via the service client (the caller has
 * no auth yet for anon flows, and RLS on `sessions.is_active = true` would
 * hide the row from anon readers otherwise). Classification rules:
 *
 *   1. Token not found / empty input  → `invalid.not_found`
 *   2. Token row has `is_active = false` → `invalid.expired`
 *      (session_tokens has NO `expires_at` column per migration 004; the
 *      active flag is the liveness signal)
 *   3. Parent session has `is_active = false` or is missing → `invalid.session_ended`
 *   4. Token has `user_id != null`  → `returning-auth` (+ user if cookie matches)
 *   5. Token has `anon_user_id != null`  → `returning-anon`
 *   6. Otherwise                      → `fresh`
 *
 * ### Winston F-note — Anon cookie mismatch handling (explicit decision)
 *
 * When the token in the DB has `anon_user_id = X` but the current caller's
 * anon cookie is `anon_user_id = Y` (regenerated due to cookie loss, device
 * switch, or browser change), we **deliberately do NOT introduce a fifth
 * `"fresh-but-claimed"` state**. Rationale:
 *
 *   - Consumers (`PlayerJoinClient`) already handle cookie mismatch via the
 *     reconcile-session-token flow (migration 118) + sessionStorage/
 *     localStorage fallback per the Resilient Reconnection Rule (CLAUDE.md).
 *     Adding a fifth state here would duplicate that logic in two places,
 *     and the upgrade path already works whether the token is anon- or
 *     auth-bound.
 *   - The `"returning-anon"` branch is **deliberately over-inclusive**: it
 *     means "this token has SOME anon identity attached", without promising
 *     it matches the current caller. The client's reconnect-from-storage
 *     flow validates ownership via sessionStorage/localStorage before
 *     trusting anything; if those fail, the server-side name-list fallback
 *     (cadeia de fallbacks L4 per CLAUDE.md) gates re-association.
 *   - If we returned `"fresh-but-claimed"` for cookie-mismatch, the UI
 *     would need to distinguish "token is claimed by ME" vs "token is
 *     claimed by SOMEONE ELSE" — but that ownership check is already the
 *     PlayerJoinClient's job (split-brain protection), and surfacing it
 *     in state detection would fork the UX contract in ways that don't
 *     help the consumer.
 *
 * **Invariant**: `detectJoinState` returns `"returning-anon"` whenever
 * `anon_user_id IS NOT NULL`, regardless of whose cookie is presenting.
 * Consumers that need to distinguish "same anon" from "different anon"
 * must compare `sessionToken.anonUserId` to the caller's current anon id
 * themselves (usually via sessionStorage + reconcile flow, NOT via
 * detectJoinState).
 */
export async function detectJoinState(token: string): Promise<JoinState> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return { state: "invalid", reason: "not_found" };
  }

  const service = createServiceClient();

  // Phase 1: token lookup. We don't filter on is_active here — we want to
  // distinguish "token exists but revoked" (→ expired) from "token doesn't
  // exist at all" (→ not_found).
  const { data: tokenRow, error: tokenError } = await service
    .from("session_tokens")
    .select("id, session_id, token, player_name, anon_user_id, user_id, is_active, last_seen_at")
    .eq("token", token)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return { state: "invalid", reason: "not_found" };
  }

  if (tokenRow.is_active === false) {
    return { state: "invalid", reason: "expired" };
  }

  // Phase 2: session lookup. session_ended is distinct UX copy from
  // expired (token revoked), so we surface it as its own reason.
  const { data: sessionRow } = await service
    .from("sessions")
    .select("id, name, is_active, campaign_id, ruleset_version, dm_plan")
    .eq("id", tokenRow.session_id)
    .maybeSingle();

  if (!sessionRow || sessionRow.is_active === false) {
    return { state: "invalid", reason: "session_ended" };
  }

  const sessionToken: SessionTokenSummary = {
    id: tokenRow.id,
    sessionId: tokenRow.session_id,
    token: tokenRow.token,
    playerName: tokenRow.player_name,
    anonUserId: tokenRow.anon_user_id,
    userId: tokenRow.user_id,
    isActive: tokenRow.is_active,
    lastSeenAt: tokenRow.last_seen_at,
  };

  const session: JoinSessionSummary = {
    id: sessionRow.id,
    name: sessionRow.name,
    isActive: sessionRow.is_active,
    campaignId: sessionRow.campaign_id ?? null,
    rulesetVersion: sessionRow.ruleset_version,
    dmPlan: sessionRow.dm_plan,
  };

  // Phase 3: classify. Auth-bound tokens (user_id set) take precedence over
  // anon-bound — migration 142 explicitly allows both to co-exist post-
  // upgrade (same UUID), and we want to render the auth experience.
  if (tokenRow.user_id) {
    // Best-effort auth user fetch. If the caller's cookie doesn't match
    // (e.g. they came from a different browser), authUser will be null —
    // we still report returning-auth because the token itself is bound to
    // an auth user, and the UI will drive login if needed.
    const authUser = await getAuthUser();
    if (authUser && authUser.id === tokenRow.user_id) {
      return { state: "returning-auth", sessionToken, session, user: authUser };
    }
    // Token is auth-bound but caller isn't that user right now. We still
    // return returning-auth (with a synthetic "absent user" shape would be
    // wrong — the User type is non-nullable in this branch) — instead we
    // fall back to returning-anon so the UI renders reconnect-or-login.
    // This keeps the consumer contract: "returning-auth" is ONLY emitted
    // when we can hand back a matching User.
    return { state: "returning-anon", sessionToken, session };
  }

  if (tokenRow.anon_user_id) {
    return { state: "returning-anon", sessionToken, session };
  }

  return { state: "fresh", sessionToken, session };
}
