/**
 * Player HQ V2 (Grimório) feature flag — Sprint 1 Track B (EP-INFRA.2).
 *
 * Gates the 4-tab Player HQ redesign (Herói/Arsenal/Diário/Mapa) and all
 * downstream conversion + journey surfaces that will start reading it from
 * Sprint 2 onward. Flag stays OFF in prod through Sprint 9; flips ON in
 * Sprint 10 (MVP flag flip). While OFF, master remains deployable and
 * users see the existing V1 Player HQ (7-tab sheet).
 *
 * Naming rationale: the sprint plan and PRD initially referenced
 * `NEXT_PUBLIC_PLAYER_HQ_V4` (matching redesign-proposal v0.4). Grep on
 * 2026-04-23 (Sprint 1 Day 1 Task 0) showed zero hits in code — only doc
 * mentions. Per Dani directive we standardize on V2 fresh; docs listing
 * V4 will be updated separately. See `_bmad-output/party-mode-2026-04-22/
 * 14-sprint-plan.md §2` and `§10 Go/no-go`.
 *
 * Usage (to begin Sprint 2):
 *   import { isPlayerHqV2Enabled, PLAYER_HQ_V2_FLAG } from "@/lib/flags/player-hq-v2";
 *   if (isPlayerHqV2Enabled()) { ...render new 4-tab shell... }
 *
 * Timeline: Sprint 10 deletes this file together with all call sites.
 * See `docs/feature-flags.md` for rollout + cleanup plan.
 *
 * Distinct from:
 *   - `lib/flags.ts`            — env-driven beta rollout flags (shared keys).
 *   - `lib/feature-flags.ts`    — Supabase-backed subscription/plan flags.
 * This file is a dedicated single-purpose module for the Grimório rollout
 * so Sprint 10 cleanup is a trivial file delete + grep replace.
 */

/**
 * Canonical env-var name. Exported so tests, docs, CI guards, and the
 * Sprint 10 cleanup grep can reference a single source of truth instead
 * of hard-coding the string.
 */
export const PLAYER_HQ_V2_FLAG = "NEXT_PUBLIC_PLAYER_HQ_V2" as const;

/**
 * Returns `true` only when `NEXT_PUBLIC_PLAYER_HQ_V2` equals the exact
 * string `"true"`. Any other value (`"1"`, `"yes"`, unset, empty, typo)
 * resolves to `false`. The strict compare mirrors the convention used
 * by `NEXT_PUBLIC_E2E_MODE` (see `.env.example`): risky rollouts demand
 * a single unambiguous opt-in value so staging/prod can never enable
 * the flag by accident via a truthy-ish string.
 *
 * Safe to call from both server and client (Next.js inlines the
 * `NEXT_PUBLIC_*` var at build time for the client bundle).
 */
export function isPlayerHqV2Enabled(): boolean {
  return process.env.NEXT_PUBLIC_PLAYER_HQ_V2 === "true";
}
