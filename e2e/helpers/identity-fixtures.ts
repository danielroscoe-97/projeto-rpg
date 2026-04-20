/**
 * e2e/helpers/identity-fixtures.ts
 *
 * Helper kit for Story 02-I — Epic 02 Player Identity E2E suite.
 *
 * These helpers wrap the dev-only routes under `/api/e2e/*` (auth-as-anon,
 * seed-session-token, cleanup) and provide a stable login + campaign-setup
 * surface so the 4 specs under `e2e/invite/` and `e2e/dashboard/` can share
 * setup without duplicating POST/fetch plumbing.
 *
 * ## Hard requirements for execution
 *
 * 1. The Next.js server must run with `NEXT_PUBLIC_E2E_MODE=true`. The
 *    playwright.config.ts sets this automatically for local dev; remote
 *    runs (BASE_URL set) expect the remote deploy to already have the
 *    hooks exposed. If the gate is off, the dev routes return 404 and the
 *    helpers throw — specs should wrap their `test.beforeAll` in try/catch
 *    and call `test.skip(true, ...)` with the error.message.
 *
 * 2. Supabase service-role creds must be present on the server process
 *    (`SUPABASE_SERVICE_ROLE_KEY`). This is used by /api/e2e/cleanup and
 *    /api/e2e/seed-session-token — the browser never sees the key.
 *
 * 3. DM accounts (DM_PRIMARY, etc) need to be seeded via
 *    `scripts/seed-test-accounts.ts` for loginAs() flows.
 *
 * ## What these helpers DO NOT do
 *
 * - Create campaigns programmatically. That requires either a DM UI walk
 *   or a service-role insert; both are heavier than what we want in
 *   every spec. Use `createCampaignWithMember` below only as a best-effort
 *   helper — it depends on a seed endpoint or manual DB insert.
 *
 * - Revoke session_tokens. Call /api/e2e/cleanup with sessionTokenIds.
 */

import { type Page, type BrowserContext, expect } from "@playwright/test";
import type { TestAccount } from "../fixtures/test-accounts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnonAuthResult {
  userId: string;
  expiresAt: number | null;
}

export interface SeededSessionToken {
  token: string;
  sessionTokenId: string;
  sessionId: string;
}

export interface CleanupPayload {
  sessionTokenIds?: string[];
  anonUserIds?: string[];
  playerCharacterIds?: string[];
}

export interface CleanupResult {
  ok: boolean;
  deleted: {
    sessionTokens: number;
    anonUsers: number;
    playerCharacters: number;
  };
  skipped?: { id: string; reason: string }[];
  errors?: string[];
}

// ---------------------------------------------------------------------------
// Dev-route helpers
// ---------------------------------------------------------------------------

/**
 * Perform a server-side anon sign-in for the page's browser context.
 *
 * After this returns, the context has valid Supabase anon cookies. This is
 * the pre-join path used to test "already anon, visits /join/[token]"
 * scenarios without walking the lobby UI.
 *
 * The dev route /api/e2e/auth-as-anon sets Set-Cookie headers via the
 * Supabase server client — Playwright's browser context picks them up.
 *
 * Throws if the gate is closed (NEXT_PUBLIC_E2E_MODE !== "true") or if
 * Supabase rejects the anon sign-in. Spec authors: catch in beforeAll and
 * call test.skip(true, err.message).
 */
export async function createAnonUser(page: Page): Promise<AnonAuthResult> {
  const response = await page.request.post("/api/e2e/auth-as-anon", {});

  if (response.status() === 404) {
    throw new Error(
      "createAnonUser: /api/e2e/auth-as-anon returned 404 — " +
        "NEXT_PUBLIC_E2E_MODE likely not set to 'true' on the server",
    );
  }
  if (!response.ok()) {
    const body = await response.text().catch(() => "<unreadable>");
    throw new Error(
      `createAnonUser: HTTP ${response.status()} — ${body.slice(0, 200)}`,
    );
  }

  const body = (await response.json()) as {
    ok: boolean;
    userId?: string;
    expiresAt?: number | null;
    error?: string;
  };

  if (!body.ok || !body.userId) {
    throw new Error(
      `createAnonUser: response.ok=false — ${body.error ?? "no details"}`,
    );
  }

  return {
    userId: body.userId,
    expiresAt: body.expiresAt ?? null,
  };
}

/**
 * Seed a session_tokens row for a DM's active session and return the share
 * token so specs can navigate directly to /join/[token].
 *
 * Requires the DM to already have an active session for the campaign. The
 * dev route will NOT create a session (see /api/e2e/seed-session-token
 * source: "we do NOT create sessions here because sessions require owner_id
 * tied to the DM and sprawling invariants").
 *
 * @param page       Any page whose context can hit the dev route.
 * @param campaignId UUID of the campaign with an active session.
 * @param playerName Optional — pre-fills player_name on the token row.
 */
export async function seedSessionToken(
  page: Page,
  campaignId: string,
  playerName?: string,
): Promise<SeededSessionToken> {
  const response = await page.request.post("/api/e2e/seed-session-token", {
    data: { campaignId, playerName: playerName ?? null },
  });

  if (response.status() === 404) {
    throw new Error(
      "seedSessionToken: /api/e2e/seed-session-token returned 404 — " +
        "NEXT_PUBLIC_E2E_MODE likely not set to 'true' on the server",
    );
  }
  if (!response.ok()) {
    const body = await response.text().catch(() => "<unreadable>");
    throw new Error(
      `seedSessionToken: HTTP ${response.status()} — ${body.slice(0, 200)}`,
    );
  }

  const body = (await response.json()) as {
    ok: boolean;
    token?: string;
    sessionTokenId?: string;
    sessionId?: string;
    error?: string;
  };

  if (!body.ok || !body.token || !body.sessionTokenId || !body.sessionId) {
    throw new Error(
      `seedSessionToken: response.ok=false — ${body.error ?? "no details"}`,
    );
  }

  return {
    token: body.token,
    sessionTokenId: body.sessionTokenId,
    sessionId: body.sessionId,
  };
}

/**
 * Drop fixtures created during a spec. Safe to call multiple times — IDs
 * that don't exist are silently skipped by the server. Non-anon auth.users
 * rows are refused (server-side `is_anonymous` check); only anon users
 * can be deleted here.
 *
 * Never truncates — only wipes the ids you pass.
 */
export async function cleanup(
  page: Page,
  ids: CleanupPayload,
): Promise<CleanupResult> {
  const response = await page.request.delete("/api/e2e/cleanup", {
    data: ids,
  });

  if (response.status() === 404) {
    throw new Error(
      "cleanup: /api/e2e/cleanup returned 404 — " +
        "NEXT_PUBLIC_E2E_MODE likely not set to 'true' on the server",
    );
  }
  // 207 Multi-Status is expected on partial success (some ids missing) — don't treat as error
  if (!response.ok() && response.status() !== 207) {
    const body = await response.text().catch(() => "<unreadable>");
    throw new Error(
      `cleanup: HTTP ${response.status()} — ${body.slice(0, 200)}`,
    );
  }

  return (await response.json()) as CleanupResult;
}

// ---------------------------------------------------------------------------
// Login flow — hits the real /auth/login form
// ---------------------------------------------------------------------------

/**
 * Log in via the public /auth/login form. Waits for the redirect to
 * /app/**. Use this when the spec needs a real signed-in session cookie,
 * not the anon cookie from createAnonUser.
 *
 * Mirrors helpers/auth.ts loginAs() but takes raw email/password so specs
 * can craft unique emails for signup flows. Supports the E2E_DM_EMAIL /
 * E2E_DM_PASSWORD env override, which is useful when running against a
 * staging environment where the bundled test accounts weren't seeded.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  const resolvedEmail = process.env.E2E_DM_EMAIL || email;
  const resolvedPassword = process.env.E2E_DM_PASSWORD || password;

  await page.goto("/auth/login");
  await page.waitForLoadState("domcontentloaded");

  await page.fill("#login-email", resolvedEmail);
  await page.fill("#login-password", resolvedPassword);
  await page.click('button[type="submit"]');

  // M21 (Wave 2 code review): fast-fail when the form surfaces an auth error
  // banner instead of waiting out the full 30s `waitForURL` timeout. The
  // login form renders `<p id="login-error" role="alert">` (see
  // components/login-form.tsx) when Supabase rejects the credentials — we
  // race visibility of that element against the redirect and throw
  // immediately on visible error so the spec sees a useful message in < 3s
  // rather than a generic timeout 10x later.
  const errorLocator = page.locator("#login-error");

  const redirectPromise: Promise<"redirect"> = page
    .waitForURL("**/app/**", {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    })
    .then(() => "redirect" as const);

  const errorPromise: Promise<"error"> = errorLocator
    .waitFor({ state: "visible", timeout: 3_000 })
    .then(() => "error" as const);

  const outcome = await Promise.race([
    redirectPromise,
    errorPromise.catch(() => null),
  ]);

  if (outcome === "error") {
    const msg = (await errorLocator.textContent())?.trim() ?? "unknown auth error";
    throw new Error(`loginAs failed: ${msg}`);
  }

  // If the race resolved via `null` from the caught errorPromise rejection
  // (timeout before error appeared), the redirect is still pending — await
  // it fully so downstream steps see the post-login URL.
  if (outcome === null) {
    await redirectPromise;
  }
}

/** Convenience overload for pre-seeded TestAccount fixtures. */
export async function loginAsAccount(
  page: Page,
  account: TestAccount,
): Promise<void> {
  return loginAs(page, account.email, account.password);
}

// ---------------------------------------------------------------------------
// Post-signup synchronization (F31 flakiness mitigation)
// ---------------------------------------------------------------------------

/**
 * Wait for Supabase sign-up/sign-in to settle.
 *
 * Pattern from Story 01-F — Follow-up #31 (Wave 0 AC): the supabase.auth
 * client sets the `sb-<project>-auth-token` cookie AFTER the /auth/v1/signup
 * response returns. If the spec asserts immediately after the submit click,
 * the cookie may still be missing and the next navigation loses the session.
 *
 * Two-phase wait:
 *   1. waitForResponse on the Supabase HTTP endpoint — the network call
 *      completed and returned a 200.
 *   2. waitForFunction on document.cookie — the sb-* cookie is present on
 *      the browser side.
 *
 * @param page             Browser page.
 * @param endpointPattern  RegExp matching the Supabase endpoint you expect
 *                         (e.g. /\/auth\/v1\/signup/ or /\/api\/player-identity\/upgrade/).
 */
export async function waitForAuthSettle(
  page: Page,
  endpointPattern: RegExp,
): Promise<void> {
  // Don't throw if the response matcher times out — the caller may already
  // have awaited it. Use a tight timeout as an observability aid.
  await Promise.race([
    page
      .waitForResponse((resp) => endpointPattern.test(resp.url()) && resp.status() < 500, {
        timeout: 15_000,
      })
      .catch(() => null),
    page.waitForTimeout(15_000),
  ]);

  // The sb-* cookie must be present. We poll instead of single-checking
  // because Safari/iOS webkit is occasionally slow to commit Set-Cookie.
  await page.waitForFunction(
    () => {
      return /sb-[^=;]+-auth-token=/.test(document.cookie);
    },
    { timeout: 10_000 },
  );
}

// ---------------------------------------------------------------------------
// AuthModal flow — ships in Epic 02 Story 02-C
// ---------------------------------------------------------------------------

/**
 * Walk the AuthModal signup tab and submit. Assumes the modal is already
 * open (invite landing "Criar conta" button was clicked). Does NOT wait
 * for post-signup navigation — the modal closes async and the caller
 * should assert on the next URL / section visibility.
 *
 * Testid contract: auth.modal.* from docs/testing-data-testid-contract.md §3.4.
 */
export async function fillAuthModalSignup(
  page: Page,
  credentials: { email: string; password: string; displayName: string },
): Promise<void> {
  const modal = page.locator('[data-testid="auth.modal.root"]');
  await expect(modal).toBeVisible({ timeout: 15_000 });

  // Ensure we're on the signup tab — modal may open on login by default.
  const signupTab = page.locator('[data-testid="auth.modal.tab-signup"]');
  if (await signupTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const state = await signupTab.getAttribute("data-state");
    if (state !== "active") {
      await signupTab.click();
    }
  }

  await page.locator('[data-testid="auth.modal.email-input"]').fill(credentials.email);
  await page.locator('[data-testid="auth.modal.password-input"]').fill(credentials.password);

  const displayNameInput = page.locator('[data-testid="auth.modal.display-name-input"]');
  // display-name-input is signup-only — safe to skip if missing
  if (await displayNameInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await displayNameInput.fill(credentials.displayName);
  }

  await page.locator('[data-testid="auth.modal.submit-button"]').click();
}

// ---------------------------------------------------------------------------
// Campaign setup helpers (best-effort)
// ---------------------------------------------------------------------------

/**
 * Create a campaign and add a player member. This function is intentionally
 * best-effort: driving the full campaign-creation wizard from the UI is
 * brittle, and the tests that need this setup should run against
 * pre-seeded fixtures where possible.
 *
 * @returns The campaignId if successful, or null to signal "fall back to
 *          preseeded data". Specs should `test.skip` on null.
 *
 * TODO(quinn-02-I): implement using the DM's "new campaign" quick action
 * once a stable data-testid contract exists for the flow. Until then
 * returns null and specs that rely on a throwaway campaign skip cleanly.
 */
export async function createCampaignWithMember(
  _page: Page,
  _dmAccount: TestAccount,
  _playerAccount: TestAccount,
): Promise<{ campaignId: string; campaignName: string } | null> {
  // Placeholder — see TODO.
  return null;
}

/**
 * Retrieve the current session_token_id from the page's storage.
 *
 * Duplicated from identity-upgrade-helpers.ts (same convention) so the
 * invite/dashboard specs don't pull the 01-F helper into their import tree.
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
 * Poll an assertion at a short interval until it passes. Useful when
 * waiting for post-signup data to propagate to the server and back.
 *
 * Prefer page.waitForFunction() when the check is DOM-based. Use this for
 * cross-cutting waits (e.g. waiting for a storage key to flip).
 */
export async function pollUntil<T>(
  fn: () => Promise<T | null>,
  opts: { timeout?: number; interval?: number } = {},
): Promise<T> {
  const timeout = opts.timeout ?? 10_000;
  const interval = opts.interval ?? 250;
  const deadline = Date.now() + timeout;
  let lastErr: unknown = null;
  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result !== null && result !== undefined) return result;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((res) => setTimeout(res, interval));
  }
  throw new Error(
    `pollUntil: timeout after ${timeout}ms${lastErr ? ` — last error: ${String(lastErr)}` : ""}`,
  );
}

// ---------------------------------------------------------------------------
// Cleanup context tracking — makes it easy to wipe everything at end of spec
// ---------------------------------------------------------------------------

/**
 * A mutable container that collects IDs created during a spec so the
 * afterAll hook can pass them to cleanup() in one call.
 *
 * Usage:
 *   const cleanupCtx = createCleanupContext();
 *   const { sessionTokenId } = await seedSessionToken(page, campaignId);
 *   cleanupCtx.sessionTokenIds.push(sessionTokenId);
 *   ...
 *   test.afterAll(() => cleanup(page, cleanupCtx));
 */
export function createCleanupContext(): Required<CleanupPayload> {
  return {
    sessionTokenIds: [],
    anonUserIds: [],
    playerCharacterIds: [],
  };
}

// Re-export BrowserContext type to help spec authors avoid the
// duplicate @playwright/test imports.
export type { BrowserContext };
