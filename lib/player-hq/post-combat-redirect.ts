/**
 * Post-Combat redirect resolver — single source of truth for decision #43
 * (PRD-EPICO-CONSOLIDADO.md) + the Sprint 2 A6 scope
 * (`20-post-combat-screen-spec.md`).
 *
 * Branches by access mode × `NEXT_PUBLIC_PLAYER_HQ_V2` so the Guest lock-in
 * survives any future tweak to the Anon/Auth flows:
 *
 *   | Mode  | Flag OFF (prod today) | Flag ON (V2)                         |
 *   |-------|-----------------------|--------------------------------------|
 *   | Guest | /app/dashboard        | /app/dashboard (decision #43 locked) |
 *   | Anon  | /app/dashboard        | /app/campaigns/:id/sheet?tab=heroi   |
 *   | Auth  | /app/dashboard        | /app/campaigns/:id/sheet?tab=heroi   |
 *
 * The Guest row NEVER points at `/sheet` regardless of the flag — Guest has
 * no seeded `campaign_id` so there is no coherent HQ to hydrate. This is
 * asserted by `e2e/conversion/post-combat-redirect-heroi-guest.spec.ts`.
 *
 * Callers: `RecapCtaCard` (anon), `GuestRecapFlow` (guest, safety net only
 * — its router.push is already hard-coded to dashboard), `GuestUpsellModal`
 * (fallback), `PostCombatBanner` (V2 shell).
 *
 * Keep this module pure + stateless so it works in SSR, unit tests, and
 * the Playwright webServer context without extra setup.
 */

import { isPlayerHqV2Enabled } from "@/lib/flags/player-hq-v2";

export type PostCombatMode = "guest" | "anon" | "auth";

export interface PostCombatRedirectInput {
  /** Access mode — determines the Guest lock-in vs Anon/Auth V2 branch. */
  mode: PostCombatMode;
  /**
   * Campaign id is required to compose the V2 Hero target. When null and
   * the caller resolves to the V2 branch, we safely fall back to
   * `/app/dashboard` so the redirect never 500s on a missing :id segment.
   */
  campaignId?: string | null;
  /**
   * Optional override so tests / preview environments can force a specific
   * target without flipping `NEXT_PUBLIC_PLAYER_HQ_V2`. Takes precedence
   * over the flag-derived default.
   */
  override?: string | null;
  /**
   * Dependency injection for the flag check. Defaults to
   * `isPlayerHqV2Enabled()`; passing an explicit boolean lets unit tests
   * cover both branches without mutating `process.env`.
   */
  flagEnabled?: boolean;
}

export const POST_COMBAT_DASHBOARD_PATH = "/app/dashboard";

/**
 * Compose the `/sheet?tab=heroi` path for a campaign. Exposed separately so
 * E2Es can build the expected URL without duplicating the literal format.
 */
export function buildHeroiSheetPath(campaignId: string): string {
  return `/app/campaigns/${campaignId}/sheet?tab=heroi`;
}

/**
 * Resolve the post-combat redirect target. Honors:
 *   1. Caller-supplied `override` (test/preview escape hatch).
 *   2. Guest lock-in — always dashboard.
 *   3. Flag ON + campaignId present — `buildHeroiSheetPath`.
 *   4. Fallback — `/app/dashboard` (flag OFF, or missing campaignId on V2).
 *
 * Returns a path string (leading slash, no origin) so it drops straight
 * into `router.push`, `goto`, or `redirectTo` props.
 */
export function resolvePostCombatRedirect(
  input: PostCombatRedirectInput,
): string {
  const { mode, campaignId, override } = input;
  const flagEnabled = input.flagEnabled ?? isPlayerHqV2Enabled();

  if (override) return override;

  // Decision #43 — Guest keeps dashboard regardless of flag.
  if (mode === "guest") return POST_COMBAT_DASHBOARD_PATH;

  if (flagEnabled && campaignId) return buildHeroiSheetPath(campaignId);

  return POST_COMBAT_DASHBOARD_PATH;
}

/**
 * Test-assist toggle — lets Playwright specs shrink the post-combat
 * "recent window" from the default 5 minutes to ~500ms so the E2E suite
 * doesn't need to sleep minutes to verify staleness behavior.
 *
 * Reads from `process.env.NEXT_PUBLIC_DEBUG_POST_COMBAT_REDIRECT_MS`. Safe in the
 * browser bundle because Next inlines the value at build time; if it is
 * unset we return the production default.
 */
export const DEFAULT_POST_COMBAT_WINDOW_MS = 5 * 60 * 1000; // 5 min

export function postCombatWindowMs(): number {
  const raw = process.env.NEXT_PUBLIC_DEBUG_POST_COMBAT_REDIRECT_MS;
  if (!raw) return DEFAULT_POST_COMBAT_WINDOW_MS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_POST_COMBAT_WINDOW_MS;
}
