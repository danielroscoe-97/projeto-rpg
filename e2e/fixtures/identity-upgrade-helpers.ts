/**
 * e2e/fixtures/identity-upgrade-helpers.ts
 *
 * Helpers for Story 01-F E2E specs that exercise the identity upgrade saga:
 *   - identity-upgrade-mid-combat.spec.ts
 *   - guest-signup-character-portable.spec.ts
 *   - anon-claim-upgrade-ownership.spec.ts
 *
 * ### Environment prerequisites
 *
 * These helpers assume:
 *   1. A running Next.js app with migrations 142-145 applied.
 *   2. `BASE_URL` points at a Supabase-connected environment (local dev
 *      or staging; not prod).
 *   3. Test DM credentials available via E2E_DM_EMAIL / E2E_DM_PASSWORD or
 *      the DM_PRIMARY account is seeded (scripts/seed-test-accounts.ts).
 *   4. For signup flows: email verification is disabled OR uses a known
 *      test mailbox (we use `+upgrade-N@` aliases to bypass rate limits).
 *
 * ### What these helpers DON'T do
 *
 * They do NOT mock the server — the whole point is to exercise the real
 * upgrade saga against real Postgres with real RLS. If you need unit-level
 * coverage of the saga, see tests/player-identity/*.test.ts.
 */

import { type Page, type BrowserContext, expect } from "@playwright/test";
import { dmAcceptPlayer } from "../helpers/multi-player";

/**
 * Generate a unique test email for an upgrade attempt. Using the `+tag`
 * alias convention lets the same inbox receive many signups without
 * duplicate-key conflicts in auth.users.email.
 */
export function uniqueUpgradeEmail(tag: string): string {
  const n = Date.now();
  const base = process.env.E2E_TEST_EMAIL_BASE ?? "e2e-upgrade";
  const domain = process.env.E2E_TEST_EMAIL_DOMAIN ?? "test-taverna.com";
  return `${base}+${tag}-${n}@${domain}`;
}

/**
 * Navigate anonymously to a DM-issued join URL and complete late-join
 * registration as an anon player. Returns once the player-view is visible.
 *
 * This helper is used when the E2E needs an anon player "in combat" BEFORE
 * triggering the upgrade saga.
 *
 * ### DM accept flow
 *
 * Production does NOT auto-accept late-join requests — the DM must click
 * "Aceitar" in the JoinRequestBanner. Pass `dmPage` to have this helper
 * drive the accept on behalf of the test. Without `dmPage`, the helper
 * will fall through to waiting for `player-view` directly, which only
 * succeeds if the calling spec performs the accept separately.
 */
export async function anonJoinCombat(
  page: Page,
  shareToken: string,
  playerName: string = "AnonUpgradeTester",
  opts: { initiative?: string; hp?: string; ac?: string; dmPage?: Page } = {},
): Promise<void> {
  await page.goto(`/join/${shareToken}`);
  await page.waitForLoadState("domcontentloaded");

  // Lobby form — anon auth happens behind the scenes before this renders.
  const nameInput = page.locator('[data-testid="lobby-name"]');
  await expect(nameInput).toBeVisible({ timeout: 15_000 });

  // Give the Supabase realtime subscription time to connect.
  await page.waitForTimeout(5_000);

  await nameInput.fill(playerName);

  const initInput = page.locator('[data-testid="lobby-initiative"]');
  await expect(initInput).toBeVisible({ timeout: 3_000 });
  await initInput.fill(opts.initiative ?? "15");

  const hpInput = page.locator('[data-testid="lobby-hp"]');
  if (await hpInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await hpInput.fill(opts.hp ?? "42");
  }
  const acInput = page.locator('[data-testid="lobby-ac"]');
  if (await acInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await acInput.fill(opts.ac ?? "16");
  }

  const submitBtn = page.locator('[data-testid="lobby-submit"]');
  await expect(submitBtn).toBeVisible({ timeout: 3_000 });
  await submitBtn.click();

  // Drive the DM accept if the caller handed us the DM page.
  if (opts.dmPage) {
    await dmAcceptPlayer(opts.dmPage, playerName);
  }

  // player-view only renders once `isRegistered === true`, which the client
  // flips on combat:late_join_response accepted=true (see PlayerJoinClient).
  await expect(page.locator('[data-testid="player-view"]')).toBeVisible({
    timeout: 30_000,
  });
}

/**
 * Read the current session_token id from the anon player page.
 *
 * The token id is stored in sessionStorage + localStorage as
 * `pocketdm_session_token_id` per the resilient-reconnection spec §2.
 * Returns null if missing — callers should treat that as a test setup bug.
 */
export async function readSessionTokenId(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    return (
      sessionStorage.getItem("pocketdm_session_token_id") ||
      localStorage.getItem("pocketdm_session_token_id") ||
      null
    );
  });
}

/**
 * Trigger the identity-upgrade flow from an anon player's page.
 *
 * The actual UI for this lives in Epic 02's dashboard — at the time of
 * Story 01-F the endpoint is reachable programmatically via
 * POST /api/player-identity/upgrade, but the surface that invokes Phase 2
 * (supabase.auth.updateUser) is a React component we can trigger via
 * `data-testid="identity-upgrade-submit"` once Epic 02 lands. If the test
 * runs against an environment where that UI is NOT yet deployed, we fall
 * back to calling the endpoints directly from the browser via fetch.
 *
 * @returns The upgraded userId if the call succeeded.
 */
export async function triggerIdentityUpgrade(
  page: Page,
  credentials: {
    email: string;
    password: string;
    displayName?: string;
  },
): Promise<{ ok: true; userId: string } | { ok: false; code: string; message: string }> {
  // Prefer UI when available — it exercises the full client-server contract.
  const uiSubmit = page.locator('[data-testid="identity-upgrade-submit"]');
  if (await uiSubmit.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await page.locator('[data-testid="identity-upgrade-email"]').fill(credentials.email);
    await page.locator('[data-testid="identity-upgrade-password"]').fill(credentials.password);
    if (credentials.displayName) {
      const nameField = page.locator('[data-testid="identity-upgrade-display-name"]');
      if (await nameField.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await nameField.fill(credentials.displayName);
      }
    }
    await uiSubmit.click();
    // Wait for a success indicator.
    await expect(
      page.locator('[data-testid="identity-upgrade-success"]'),
    ).toBeVisible({ timeout: 30_000 });
    const userId = await page
      .locator('[data-testid="identity-upgrade-success"]')
      .getAttribute("data-user-id");
    return { ok: true, userId: userId ?? "" };
  }

  // Fallback: drive the saga from the browser context via fetch. This
  // requires the Supabase client to be globally available on `window` in
  // dev builds. If not, the test should be marked `test.skip` on that env.
  // TODO(quinn-01-F): once Epic 02 dashboard ships the upgrade form, delete
  // this fetch fallback.
  return await page.evaluate(async (creds) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const supabase = win.__pocketdm_supabase ?? null;
    if (!supabase) {
      return {
        ok: false as const,
        code: "no_client_in_window",
        message:
          "window.__pocketdm_supabase not exposed in this build — cannot simulate Phase 2 updateUser",
      };
    }
    // Phase 2 (client-side): updateUser promotes the anon JWT to auth.
    const up = await supabase.auth.updateUser({
      email: creds.email,
      password: creds.password,
      data: creds.displayName ? { display_name: creds.displayName } : undefined,
    });
    if (up.error) {
      return { ok: false as const, code: "update_user_failed", message: up.error.message };
    }
    const userId = up.data.user?.id as string | undefined;
    if (!userId) {
      return { ok: false as const, code: "no_user_id", message: "updateUser returned no user" };
    }
    // Phase 3 (server): POST /api/player-identity/upgrade — route re-validates
    // the JWT and invokes upgradePlayerIdentity.
    const tokenId =
      sessionStorage.getItem("pocketdm_session_token_id") ||
      localStorage.getItem("pocketdm_session_token_id");
    if (!tokenId) {
      return { ok: false as const, code: "no_session_token", message: "session_token_id missing" };
    }
    const resp = await fetch("/api/player-identity/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionTokenId: tokenId,
        credentials: creds,
      }),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body?.ok) {
      return {
        ok: false as const,
        code: (body?.code as string) ?? "server_error",
        message: (body?.message as string) ?? `HTTP ${resp.status}`,
      };
    }
    return { ok: true as const, userId: body.userId ?? userId };
  }, credentials);
}

/**
 * Utility: wait briefly for the anon player's view to re-render after an
 * in-place upgrade. The page should NOT navigate — DC1 of Epic 01 makes
 * the JWT swap invisible to the user. We just need to let React settle.
 */
export async function waitForPostUpgradeSettle(page: Page): Promise<void> {
  await page.waitForTimeout(1_500);
  // The player-view data-testid must still be present.
  await expect(page.locator('[data-testid="player-view"]')).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * Capture a snapshot of the Zustand guest combat store. Used by the
 * guest-signup spec to verify that the `is_player` character from the
 * guest's battle survived the migration into `player_characters`.
 */
export async function readGuestCharacterFromStore(
  page: Page,
): Promise<{ id: string; name: string; max_hp: number } | null> {
  return await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const store = win.__pocketdm_guest_store;
    if (!store) return null;
    const state = store.getState();
    const combatants = state?.combatants ?? [];
    type Combatant = { id: string; is_player?: boolean; name?: string; max_hp?: number };
    const pc = (combatants as Combatant[]).find((c) => c.is_player);
    if (!pc) return null;
    return {
      id: pc.id,
      name: pc.name ?? "Unknown",
      max_hp: pc.max_hp ?? 0,
    };
  });
}

/**
 * Poll the current initiative pointer on the player view. Returns the
 * combatant name on the "current turn" marker. Used by the mid-combat
 * upgrade spec to prove the turn didn't advance during Phase 2/3.
 */
export async function readCurrentTurnName(page: Page): Promise<string | null> {
  const marker = page.locator('[data-testid="player-current-turn"]');
  if (!(await marker.isVisible({ timeout: 1_000 }).catch(() => false))) {
    return null;
  }
  return (await marker.textContent())?.trim() ?? null;
}

/**
 * Read the `users` row for an email directly via a server-side API (admin).
 * Used for ownership assertions post-upgrade. This helper requires an
 * E2E-only admin endpoint OR a Supabase service-role credential in the
 * test env. If neither is available, the spec should skip with a clear
 * reason instead of silently succeeding.
 */
export async function readUserByEmailViaAdmin(
  page: Page,
  email: string,
): Promise<{ id: string; display_name: string | null } | null> {
  // TODO(quinn-01-F): wire this to an admin-only test endpoint such as
  // POST /api/test/read-user-by-email (only enabled when NODE_ENV=test).
  // Returning null for now triggers the spec to mark itself inconclusive.
  void page;
  void email;
  return null;
}
