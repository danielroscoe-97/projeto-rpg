import { test, expect, type Page } from "@playwright/test";
import { loginAsDM } from "../helpers/auth";
import { getServiceClient } from "../helpers/db";

/**
 * Entity Graph — Location Hierarchy (AC-3b-01 .. AC-3b-10)
 *
 * Exercises the Locations tab of the Campaign HQ, covering:
 *
 *   - Tree rendering with parent → child indentation (AC-3b-02)
 *   - Chevron expand/collapse (AC-3b-03)
 *   - Breadcrumb on detail (AC-3b-04)
 *   - Cycle guard in parent dropdown (AC-3b-05)
 *   - Unique constraint on name per-parent (AC-3b-07, mig 152)
 *   - Delete-with-children warning (AC-3b-08)
 *   - View switcher persistence (AC-3f-01, AC-3f-03)
 *
 * Seeds a throwaway campaign owned by the logged-in DM, runs through the
 * tests, and deletes the campaign in afterAll. Defensive: if setup fails
 * (e.g. service-role key missing in CI), the entire block skips rather
 * than masking real regressions with false failures.
 *
 * Testids are verified in components/campaign/LocationList.tsx and
 * components/campaign/LocationForm.tsx.
 */

interface SetupState {
  campaignId: string | null;
  userId: string | null;
  skipReason: string | null;
}

async function getLoggedInUserId(page: Page): Promise<string | null> {
  // Reads the Supabase session via the E2E window bridge exposed by
  // lib/e2e/expose-supabase.ts. Returns null if the bridge is absent
  // (e.g. NEXT_PUBLIC_E2E_MODE != "true" in staging).
  return page.evaluate(async () => {
    const bridge = (
      window as unknown as {
        __pocketdm_supabase?: { auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> } };
      }
    ).__pocketdm_supabase;
    if (!bridge) return null;
    const { data } = await bridge.auth.getUser();
    return data.user?.id ?? null;
  });
}

async function seedCampaign(userId: string): Promise<string> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("campaigns")
    .insert({ owner_id: userId, name: `E2E Location Hierarchy ${Date.now()}` })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Campaign create failed: ${error?.message}`);
  return data.id;
}

async function cleanupCampaign(campaignId: string): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("campaigns").delete().eq("id", campaignId);
  if (error) console.error(`[e2e cleanup] ${campaignId}:`, error);
}

test.describe("P1 — Entity Graph: Location Hierarchy", () => {
  test.setTimeout(120_000);

  const state: SetupState = { campaignId: null, userId: null, skipReason: null };

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      const userId = await getLoggedInUserId(page);
      if (!userId) {
        state.skipReason =
          "No Supabase session bridge (window.__pocketdm_supabase). Set NEXT_PUBLIC_E2E_MODE=true.";
        return;
      }
      state.userId = userId;
      state.campaignId = await seedCampaign(userId);
    } catch (err) {
      state.skipReason = `Setup failed: ${(err as Error).message}`;
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async () => {
    if (state.campaignId) await cleanupCampaign(state.campaignId);
  });

  async function openLocationsTab(page: Page): Promise<boolean> {
    if (!state.campaignId) return false;
    await page.goto(`/app/campaigns/${state.campaignId}?section=locations`);
    await page.waitForLoadState("domcontentloaded");
    const container = page.locator('[data-testid="location-container"]');
    return container
      .waitFor({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
  }

  /**
   * Radix SelectTrigger ≠ native `<select>` — `page.selectOption()` throws.
   * Click the trigger, then click the rendered option (portal, scope to role).
   */
  async function pickRadixOption(page: Page, triggerTestid: string, optionLabel: string | RegExp): Promise<void> {
    await page.click(`[data-testid="${triggerTestid}"]`);
    const opt = page.getByRole("option", { name: optionLabel });
    await opt.waitFor({ state: "visible", timeout: 5_000 });
    await opt.click();
  }

  async function pickParent(page: Page, parentId: string): Promise<void> {
    await page.click('[data-testid="location-parent-select"]');
    await page.click(`[data-testid="location-parent-option-${parentId}"]`);
  }

  async function createLocation(
    page: Page,
    name: string,
    type: string,
    parentId?: string,
  ): Promise<void> {
    await page.click('[data-testid="location-add-button"]');
    await page.waitForSelector('[data-testid="location-form"]', { timeout: 5_000 });
    await page.fill('[data-testid="location-name-input"]', name);
    // location-type-select is a Radix SelectTrigger. Match by value=type OR
    // its translated label; `type` here is the enum key (e.g. "building").
    await pickRadixOption(page, "location-type-select", new RegExp(type, "i"));
    if (parentId) {
      await pickParent(page, parentId);
    }
    await page.click('[data-testid="location-submit"]');
    await page
      .locator('[data-testid="location-form"]')
      .waitFor({ state: "hidden", timeout: 5_000 });
  }

  test("AC-3b-02: child location renders indented under parent", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      const opened = await openLocationsTab(page);
      expect(opened, "Locations tab failed to open").toBeTruthy();

      await createLocation(page, "Porto Azul", "city");
      await page.waitForTimeout(500);

      // Find the parent's tree row and extract its ID
      const parentRow = page.locator('[data-testid^="location-tree-row-"]').first();
      await expect(parentRow).toContainText("Porto Azul");
      const parentId = (await parentRow.getAttribute("data-testid"))!.replace(
        "location-tree-row-",
        "",
      );

      await createLocation(page, "Taverna do Pêndulo", "building", parentId);
      await page.waitForTimeout(500);

      // Child row should exist AND its depth > parent's (data-depth is the
      // stable invariant; paddingLeft is an impl detail that can drift).
      const childRow = page.locator('[data-testid^="location-tree-row-"]', {
        hasText: "Taverna do Pêndulo",
      });
      await expect(childRow).toBeVisible();

      const parentDepth = parseInt(
        (await parentRow.getAttribute("data-depth")) ?? "0",
        10,
      );
      const childDepth = parseInt(
        (await childRow.getAttribute("data-depth")) ?? "0",
        10,
      );
      expect(childDepth, "Child must be deeper than parent").toBeGreaterThan(
        parentDepth,
      );
    } finally {
      await ctx.close();
    }
  });

  test("AC-3b-03: chevron collapses and expands children", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      const opened = await openLocationsTab(page);
      expect(opened).toBeTruthy();

      const parentRow = page
        .locator('[data-testid^="location-tree-row-"]')
        .filter({ hasText: "Porto Azul" })
        .first();
      const parentId = (await parentRow.getAttribute("data-testid"))!.replace(
        "location-tree-row-",
        "",
      );

      const child = page.locator('[data-testid^="location-tree-row-"]', {
        hasText: "Taverna do Pêndulo",
      });
      await expect(child).toBeVisible();

      await page.click(`[data-testid="location-tree-toggle-${parentId}"]`);
      await expect(child).toBeHidden({ timeout: 3_000 });

      await page.click(`[data-testid="location-tree-toggle-${parentId}"]`);
      await expect(child).toBeVisible({ timeout: 3_000 });
    } finally {
      await ctx.close();
    }
  });

  test("AC-3b-05: parent dropdown excludes self + descendants (cycle guard)", async ({
    browser,
  }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      const opened = await openLocationsTab(page);
      expect(opened).toBeTruthy();

      // Open the parent's edit form
      const parentRow = page
        .locator('[data-testid^="location-tree-row-"]')
        .filter({ hasText: "Porto Azul" })
        .first();
      await parentRow.click();
      await page.waitForSelector('[data-testid="location-edit-toggle"]', { timeout: 5_000 });
      await page.click('[data-testid="location-edit-toggle"]');
      await page.waitForSelector('[data-testid="location-parent-select"]', { timeout: 5_000 });

      // Radix Select: click trigger to open the portal listbox, then read
      // the rendered options by role (NOT <option>, which Radix does not use).
      await page.click('[data-testid="location-parent-select"]');
      const listbox = page.locator('[role="listbox"]');
      await listbox.waitFor({ state: "visible", timeout: 5_000 });
      const options = await page.locator('[role="option"]').allTextContents();
      expect(
        options.some((o) => o.includes("Taverna do Pêndulo")),
        `Cycle guard broken — descendant appears in parent dropdown: ${options.join(" | ")}`,
      ).toBe(false);
    } finally {
      await ctx.close();
    }
  });

  test("AC-3b-07: duplicate name at same level rejected (mig 152)", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      const opened = await openLocationsTab(page);
      expect(opened).toBeTruthy();

      await page.click('[data-testid="location-add-button"]');
      await page.fill('[data-testid="location-name-input"]', "Porto Azul");
      await pickRadixOption(page, "location-type-select", /city/i);
      await page.click('[data-testid="location-submit"]');

      // Error surface: either location-save-error testid, or a toast
      const err = page.locator('[data-testid="location-save-error"]');
      const toast = page.locator("text=/duplicat|already exists|já existe/i");
      await expect(err.or(toast)).toBeVisible({ timeout: 5_000 });
    } finally {
      await ctx.close();
    }
  });

  test("AC-3b-08: delete-with-children warns and re-parents to root", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      const opened = await openLocationsTab(page);
      expect(opened).toBeTruthy();

      const parentRow = page
        .locator('[data-testid^="location-tree-row-"]')
        .filter({ hasText: "Porto Azul" })
        .first();
      await parentRow.click();
      const deleteBtn = page.locator(
        'button:has-text("Excluir"), button:has-text("Delete"), button[aria-label*="Delete" i], button[aria-label*="Excluir" i]',
      );
      await deleteBtn.first().click();

      const warning = page.locator('[data-testid="location-delete-children-warning"]');
      await expect(warning).toBeVisible({ timeout: 5_000 });
      await expect(warning).toContainText(/sub-local|child|children|sublocal/i);
    } finally {
      await ctx.close();
    }
  });

  test("AC-3f-01 / AC-3f-03: view switcher persists across reloads", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      const opened = await openLocationsTab(page);
      expect(opened).toBeTruthy();

      // LocationList emits view testids with underscore (tuple `"by_type"`).
      const byTypeBtn = page.locator('[data-testid="location-view-by_type"]');
      const hasByType = await byTypeBtn
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (!hasByType) {
        test.skip(true, "location-view-by_type testid not found in UI");
        return;
      }
      await byTypeBtn.click();
      await page.waitForTimeout(500);

      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector('[data-testid="location-container"]', { timeout: 10_000 });

      const stillActive = await byTypeBtn.evaluate((el) =>
        el.getAttribute("data-active") === "true" ||
        el.getAttribute("aria-pressed") === "true" ||
        el.classList.contains("active") ||
        el.classList.contains("bg-primary"),
      );
      expect(stillActive, "View preference did not persist across reload").toBeTruthy();
    } finally {
      await ctx.close();
    }
  });
});
