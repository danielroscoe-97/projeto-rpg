import { type Page } from "@playwright/test";

/**
 * DM login helper.
 *
 * Uses Supabase test credentials from environment variables:
 *   - E2E_DM_EMAIL
 *   - E2E_DM_PASSWORD
 *
 * These should point to a pre-seeded test user in the Supabase project
 * (or a local Supabase instance via `supabase start`).
 */
export async function loginAsDM(page: Page) {
  const email = process.env.E2E_DM_EMAIL;
  const password = process.env.E2E_DM_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing E2E_DM_EMAIL or E2E_DM_PASSWORD env vars. " +
        "Set them in .env.local or pass via CLI: E2E_DM_EMAIL=x E2E_DM_PASSWORD=y npx playwright test"
    );
  }

  await page.goto("/auth/login");

  // Fill the login form (ids from login-form.tsx)
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to the dashboard (successful login)
  await page.waitForURL("**/app/dashboard", { timeout: 15_000 });
}

/**
 * Player anonymous join helper.
 *
 * Navigates the page to the player join link (e.g. /join/<token>).
 * The join page handles anonymous sign-in client-side, so no credentials
 * are needed — the player just needs a valid session share token.
 */
export async function joinAsPlayer(page: Page, shareToken: string) {
  await page.goto(`/join/${shareToken}`);

  // Wait for the player view to load (the join page renders
  // PlayerJoinClient once the token is validated server-side)
  await page.waitForSelector("[data-testid='player-view'], [data-testid='initiative-list']", {
    timeout: 15_000,
  });
}
