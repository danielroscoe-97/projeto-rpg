/**
 * Lightweight client + server feature-flag framework for risky rollouts.
 *
 * Distinct from `lib/feature-flags.ts`, which is the subscription/plan-tied
 * flag system stored in Supabase. This module is for env-driven, per-deploy
 * toggles (beta3 remediation rollouts) that gate **architecture changes**
 * like new broadcast types.
 *
 * Created by S1.2 (beta3 combatant_add_reorder). Reused by S3.1 (ff_hp_thresholds_v2)
 * and S4.2 (ff_custom_conditions_v1).
 *
 * Resolution order:
 *   1. `window.__RPG_FLAGS__` (runtime override, injected by test harness / staging)
 *   2. `process.env.NEXT_PUBLIC_FF_<KEY>` (build-time, both server and client)
 *   3. hard-coded default (usually `false` for risky rollouts)
 *
 * The truthy values accepted are: "1", "true", "on", "yes" (case-insensitive).
 */

export type FeatureFlagKey =
  /** S1.2 — combat:combatant_add_reorder broadcast type + atomic handler. */
  | "ff_combatant_add_reorder"
  /** S3.1 — new HP threshold bands (reserved). */
  | "ff_hp_thresholds_v2"
  /** S4.2 — custom conditions v1 (reserved). */
  | "ff_custom_conditions_v1"
  /** S5.2 — favoritar monstros/itens/condições (reserved). */
  | "ff_favorites_v1"
  /** S5.2 Beta 4 P0 — shared Zustand store for favorites (rate-limit storm fix). */
  | "ff_favorites_v2_shared_state"
  /** S5.1 — Polymorph / Wild Shape with two HP bars (reserved; default OFF). */
  | "ff_polymorph_v1"
  /** 2026-04-24 postmortem R3 — coalesce /api/combat/[id]/state queries with
   * per-kind TTLs (token 15s, session 10s, encounter 5s, token_owner 60s).
   * Default ON in prod; env var flips it off without redeploy if anything
   * surprises us in the wild. */
  | "ff_combat_state_coalesce_v1";

/**
 * Hard-coded defaults. Flipped to `true` on 2026-04-19 for beta 4 soak —
 * Daniel authorized general activation after rebased master shipped.
 *
 * `ff_hp_thresholds_v2` flipped back to `false` on 2026-04-20 — reverts to
 * legacy thresholds (70/40/10). Keep the flag alive because the HPLegendOverlay
 * is now desync-safe and can ride either default.
 *
 * Per-deploy overrides still work via NEXT_PUBLIC_FF_<KEY> env vars.
 */
const DEFAULTS: Record<FeatureFlagKey, boolean> = {
  ff_combatant_add_reorder: true,
  ff_hp_thresholds_v2: false,
  ff_custom_conditions_v1: true,
  ff_favorites_v1: true,
  ff_favorites_v2_shared_state: true,
  ff_polymorph_v1: true,
  ff_combat_state_coalesce_v1: true,
};

const TRUTHY = new Set(["1", "true", "on", "yes"]);

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return TRUTHY.has(String(value).toLowerCase());
}

/**
 * Read-through lookup of an env-backed flag.
 *
 * Safe to call from both server (SSR / route handlers) and client (browser).
 * On the client, Next.js only exposes `NEXT_PUBLIC_*` vars — so all flags in
 * this module MUST be named `NEXT_PUBLIC_FF_<KEY>` in the env file.
 */
export function isFeatureFlagEnabled(key: FeatureFlagKey): boolean {
  // 1. Runtime override (highest priority) — used by e2e tests and staging toggles.
  if (typeof window !== "undefined") {
    const runtime = (window as unknown as { __RPG_FLAGS__?: Partial<Record<FeatureFlagKey, boolean>> }).__RPG_FLAGS__;
    if (runtime && typeof runtime[key] === "boolean") {
      return runtime[key] as boolean;
    }
  }

  // 2. Env var (NEXT_PUBLIC so it's available on the client after Next.js inlines it).
  const envKey = `NEXT_PUBLIC_${key.toUpperCase()}`;
  // NOTE: process.env.NEXT_PUBLIC_* is inlined at build time on the client.
  // We read via a record lookup so bundlers keep the inline intact.
  const envValue = (process.env as Record<string, string | undefined>)[envKey];
  const parsed = parseBool(envValue);
  if (parsed !== undefined) return parsed;

  // 3. Hard-coded default.
  return DEFAULTS[key] ?? false;
}

/**
 * Test helper — set a runtime override. Only affects the current browser context.
 * Use from Playwright via `await page.addInitScript(...)` or from vitest via direct call.
 */
export function setFeatureFlagOverrideForTests(
  key: FeatureFlagKey,
  value: boolean | undefined
): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __RPG_FLAGS__?: Partial<Record<FeatureFlagKey, boolean>> };
  if (!w.__RPG_FLAGS__) w.__RPG_FLAGS__ = {};
  if (value === undefined) {
    delete w.__RPG_FLAGS__[key];
  } else {
    w.__RPG_FLAGS__[key] = value;
  }
}
