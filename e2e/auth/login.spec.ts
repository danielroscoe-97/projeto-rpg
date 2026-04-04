import { test, expect } from "@playwright/test";
import { loginAs, logout } from "../helpers/auth";
import { DM_PRIMARY, DM_ENGLISH, PLAYER_WARRIOR } from "../fixtures/test-accounts";

test.describe("P0 — Login Flow", () => {
  test("DM can login and reach dashboard", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);

    await expect(page).toHaveURL(/\/app\/dashboard/);
    // Main nav has aria-label="Main navigation" — use it to avoid strict mode violation
    // (dashboard has multiple <nav> elements: main, sidebar, footer)
    await expect(page.locator('button:has-text("Logout")')).toBeVisible({ timeout: 10_000 });
  });

  test("Player can login and reach app", async ({ page }) => {
    await loginAs(page, PLAYER_WARRIOR);

    await expect(page).toHaveURL(/\/app/);
    await expect(page.locator('button:has-text("Logout")')).toBeVisible({ timeout: 10_000 });
  });

  test("English DM can login", async ({ page }) => {
    await loginAs(page, DM_ENGLISH);

    await expect(page).toHaveURL(/\/app/);
    await expect(page.locator('button:has-text("Logout")')).toBeVisible({ timeout: 10_000 });
  });

  test("Invalid credentials show error", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill("#login-email", "wrong@test.com");
    await page.fill("#login-password", "WrongPassword123!");
    await page.click('button[type="submit"]');

    // Should stay on login page and show error
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(
      page.locator('[role="alert"], .text-red, .text-destructive, [id="login-error"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Login page renders correctly", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
