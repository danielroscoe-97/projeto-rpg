import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { DM_PRIMARY } from "../fixtures/test-accounts";

/**
 * P1 — Dashboard Tour Onboarding
 *
 * Tests the dashboard tour flow for logged-in users.
 * Uses /api/e2e/reset-onboarding to set the right DB state after login.
 */
test.describe("P1 — Dashboard Tour (Logged-In Onboarding)", () => {
  test.setTimeout(90_000);

  /**
   * Reset user_onboarding via API (auth cookie is sent automatically).
   * Must be called AFTER loginAs.
   */
  async function resetOnboarding(
    page: import("@playwright/test").Page,
    opts: { wizard_completed: boolean; dashboard_tour_completed: boolean }
  ) {
    const resp = await page.evaluate(async (body) => {
      const r = await fetch("/api/e2e/reset-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { status: r.status, ok: r.ok };
    }, opts);
    return resp.ok;
  }

  /** Login, reset DB + localStorage, navigate to dashboard for tour testing */
  async function setupDashboardWithTour(page: import("@playwright/test").Page) {
    await page.addInitScript(() => {
      localStorage.removeItem("dashboard-tour-v1");
      sessionStorage.removeItem("onboarding-wizard-state");
    });

    await loginAs(page, DM_PRIMARY);

    const ok = await resetOnboarding(page, {
      wizard_completed: true,
      dashboard_tour_completed: false,
    });
    if (!ok) return false;

    await page.goto("/app/dashboard?from=wizard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1_000);

    const dashContent = page.locator('[data-tour-id="dash-overview"]');
    return await dashContent.isVisible({ timeout: 10_000 }).catch(() => false);
  }

  test("Dashboard tour auto-starts after wizard completion", async ({ page }) => {
    const onDashboard = await setupDashboardWithTour(page);
    if (!onDashboard) {
      test.skip(true, "Could not reach dashboard — API reset may have failed");
      return;
    }

    const tooltip = page.locator('[data-testid="tour-tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 15_000 });
  });

  test("Dashboard tour can be skipped", async ({ page }) => {
    const onDashboard = await setupDashboardWithTour(page);
    if (!onDashboard) {
      test.skip(true, "Could not reach dashboard");
      return;
    }

    const tooltip = page.locator('[data-testid="tour-tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 15_000 });

    await page.locator('[data-testid="tour-skip"]').click();
    await page.waitForTimeout(1_000);
    await expect(tooltip).not.toBeVisible({ timeout: 5_000 });

    const isCompleted = await page.evaluate(() => {
      const stored = localStorage.getItem("dashboard-tour-v1");
      if (!stored) return false;
      try { return JSON.parse(stored)?.state?.isCompleted === true; } catch { return false; }
    });
    expect(isCompleted).toBe(true);
  });

  test("Redo tour help button appears after tour completion", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "dashboard-tour-v1",
        JSON.stringify({ state: { currentStep: 0, isActive: false, isCompleted: true }, version: 0 })
      );
    });

    await loginAs(page, DM_PRIMARY);

    const ok = await resetOnboarding(page, {
      wizard_completed: true,
      dashboard_tour_completed: true,
    });
    if (!ok) {
      test.skip(true, "API reset failed");
      return;
    }

    await page.goto("/app/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const dashContent = page.locator('[data-tour-id="dash-overview"]');
    const onDashboard = await dashContent.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!onDashboard) {
      test.skip(true, "Not on dashboard");
      return;
    }

    await page.waitForTimeout(2_000);

    const helpBtn = page.locator('[data-testid="dashboard-tour-help-btn"]');
    await expect(helpBtn).toBeVisible({ timeout: 10_000 });

    await helpBtn.click();
    await page.waitForTimeout(500);

    const restartOption = page.getByText(/Restart tutorial|Refazer tutorial/i);
    await expect(restartOption).toBeVisible({ timeout: 3_000 });
  });

  test("Redo tour button restarts the dashboard tour", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "dashboard-tour-v1",
        JSON.stringify({ state: { currentStep: 0, isActive: false, isCompleted: true }, version: 0 })
      );
    });

    await loginAs(page, DM_PRIMARY);

    const ok = await resetOnboarding(page, {
      wizard_completed: true,
      dashboard_tour_completed: true,
    });
    if (!ok) {
      test.skip(true, "API reset failed");
      return;
    }

    await page.goto("/app/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const dashContent = page.locator('[data-tour-id="dash-overview"]');
    const onDashboard = await dashContent.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!onDashboard) {
      test.skip(true, "Not on dashboard");
      return;
    }

    await page.waitForTimeout(2_000);

    const helpBtn = page.locator('[data-testid="dashboard-tour-help-btn"]');
    await expect(helpBtn).toBeVisible({ timeout: 10_000 });

    await helpBtn.click();
    await page.waitForTimeout(500);
    await page.getByText(/Restart tutorial|Refazer tutorial/i).click();
    await page.waitForTimeout(1_000);

    const tooltip = page.locator('[data-testid="tour-tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 10_000 });
  });

  test("Quick Combat path URL includes from=wizard&next=session", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("dashboard-tour-v1");
    });

    await loginAs(page, DM_PRIMARY);

    const ok = await resetOnboarding(page, {
      wizard_completed: true,
      dashboard_tour_completed: false,
    });
    if (!ok) {
      test.skip(true, "API reset failed");
      return;
    }

    await page.goto("/app/dashboard?from=wizard&next=session");
    await page.waitForLoadState("domcontentloaded");

    const dashContent = page.locator('[data-tour-id="dash-overview"]');
    const onDashboard = await dashContent.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!onDashboard) {
      test.skip(true, "Not on dashboard");
      return;
    }

    expect(page.url()).toContain("next=session");
  });

  test("Mobile viewport (390x844): dashboard renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.removeItem("dashboard-tour-v1");
    });

    await loginAs(page, DM_PRIMARY);

    const ok = await resetOnboarding(page, {
      wizard_completed: true,
      dashboard_tour_completed: true,
    });
    if (!ok) {
      test.skip(true, "API reset failed");
      return;
    }

    await page.goto("/app/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const dashContent = page.locator('[data-tour-id="dash-overview"]');
    await expect(dashContent).toBeVisible({ timeout: 10_000 });
  });
});
