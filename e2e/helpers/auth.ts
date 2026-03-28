import { type Page, expect } from "@playwright/test";
import type { TestAccount } from "../fixtures/test-accounts";

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
 * Login as DM using env vars (backwards compat).
 */
export async function loginAsDM(page: Page) {
  const email = process.env.E2E_DM_EMAIL;
  const password = process.env.E2E_DM_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing E2E_DM_EMAIL or E2E_DM_PASSWORD env vars.");
  }

  await page.goto("/auth/login");
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app/dashboard", { timeout: 30_000, waitUntil: "domcontentloaded" });
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
 * Logout by clearing cookies and storage.
 */
export async function logout(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
