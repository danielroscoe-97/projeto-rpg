import { type Page, expect } from "@playwright/test";
import type { TestAccount } from "../fixtures/test-accounts";
import { DM_PRIMARY } from "../fixtures/test-accounts";

/**
 * Login as any test account via the UI login form.
 * Falls back to E2E_DM_EMAIL/E2E_DM_PASSWORD env vars when
 * the test account fails to authenticate (e.g. not seeded in prod).
 */
export async function loginAs(page: Page, account: TestAccount) {
  // Use env var override if available (for prod testing without seeded accounts)
  const email = process.env.E2E_DM_EMAIL || account.email;
  const password = process.env.E2E_DM_PASSWORD || account.password;

  await page.goto("/auth/login");
  await page.waitForLoadState("domcontentloaded");

  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click('button[type="submit"]');

  await page.waitForURL("**/app/**", { timeout: 30_000, waitUntil: "domcontentloaded" });
}

/**
 * Login as DM Primary (convenience wrapper).
 * Uses DM_PRIMARY account by default, or env var overrides.
 */
export async function loginAsDM(page: Page) {
  const email = process.env.E2E_DM_EMAIL || DM_PRIMARY.email;
  const password = process.env.E2E_DM_PASSWORD || DM_PRIMARY.password;

  await page.goto("/auth/login");
  await page.waitForLoadState("domcontentloaded");

  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app/**", { timeout: 30_000, waitUntil: "domcontentloaded" });
}

/**
 * Player joins a session via /join/[token].
 * Works for both authenticated and anonymous players.
 */
export async function joinSession(page: Page, shareToken: string) {
  await page.goto(`/join/${shareToken}`);
  await page.waitForSelector(
    "[data-testid='player-view'], [data-testid='player-loading']",
    { timeout: 15_000 }
  );
}

/**
 * Player navigates to a session URL (full URL or path).
 * Does not wait for specific selectors — used for link-based join flows.
 */
export async function joinAsPlayer(page: Page, sessionUrl: string) {
  if (sessionUrl.startsWith("http")) {
    await page.goto(sessionUrl);
  } else {
    await page.goto(sessionUrl);
  }
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Logout by clearing cookies and storage.
 */
export async function logout(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
