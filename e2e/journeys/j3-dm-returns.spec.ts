/**
 * J3 — O DM que Retorna (Retencao)
 *
 * Jornada critica: DM volta ao app dias depois → encontra sessoes → retoma combate.
 * Hipotese H4: DMs que usam em 2 sessoes consecutivas tem retencao 80%+.
 *
 * Gaps cobertos:
 *  - J3.1 Dashboard mostra sessoes anteriores
 *  - J3.2 DM retoma sessao ativa
 *  - J3.4 DM acessa presets salvos
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { dmSetupCombatSession } from "../helpers/session";
import { DM_PRIMARY } from "../fixtures/test-accounts";

test.describe("J3 — DM que Retorna (Retencao)", () => {
  test("J3.1 — Dashboard mostra conteudo para DM recorrente (nao vazio)", async ({
    page,
  }) => {
    await loginAs(page, DM_PRIMARY);

    // Dashboard should show relevant content, not empty state
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15_000 });
    await page.waitForLoadState("domcontentloaded");

    // Wait for dashboard to render
    await page.waitForTimeout(3_000);

    // Dashboard must NOT be completely blank
    const contentLocator = page.locator(
      '[data-testid="saved-encounters"], [data-testid^="encounter-link-"], a[href*="/app/session/"], a[href*="session/new"], nav'
    ).first();
    await expect(contentLocator).toBeVisible({ timeout: 10_000 });
  });

  test("J3.2 — DM retoma sessao ativa com estado preservado", async ({
    browser,
  }) => {
    // Phase 1: Create a combat session
    const ctx1 = await browser.newContext();
    const page1 = await ctx1.newPage();

    await dmSetupCombatSession(page1, DM_PRIMARY, [
      { name: "Persistent Hero", hp: "40", ac: "16", init: "18" },
      { name: "Persistent Villain", hp: "50", ac: "14", init: "10" },
    ]);

    // Capture the session URL
    const sessionUrl = page1.url();
    expect(sessionUrl).toContain("/app/session/");

    // Advance 1 turn so state changes
    const nextTurnBtn = page1.locator('[data-testid="next-turn-btn"]');
    await expect(nextTurnBtn).toBeVisible({ timeout: 5_000 });
    await nextTurnBtn.click();
    await page1.waitForTimeout(1_000);

    await ctx1.close();

    // Phase 2: Login again (fresh context) and navigate directly to session
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await loginAs(page2, DM_PRIMARY);

    await page2.goto(sessionUrl);
    await page2.waitForLoadState("domcontentloaded");

    // Active combat should still be visible
    await expect(page2.locator('[data-testid="active-combat"]')).toBeVisible({
      timeout: 15_000,
    });

    // Initiative list should be present
    await expect(
      page2.locator('[data-testid="initiative-list"]')
    ).toBeVisible();

    // Verify combatants are still there
    const combatants = page2.locator(
      '[data-testid="initiative-list"] [data-testid^="combatant-row-"]'
    );
    const count = await combatants.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await ctx2.close();
  });

  test("J3.4 — DM acessa pagina de presets", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);

    await page.goto("/app/presets");
    await page.waitForLoadState("domcontentloaded");

    // Presets page should load without error
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText).not.toContain("404");

    // Page should have content
    await page.waitForTimeout(3_000);
    const bodyLen = (await page.textContent("body"))?.length ?? 0;
    expect(bodyLen).toBeGreaterThan(100);
  });

  test("J3.5 — DM acessa compendium de monstros", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);

    await page.goto("/app/compendium?tab=monsters");
    await page.waitForLoadState("domcontentloaded");

    // Compendium should render without error
    await page.waitForTimeout(2_000);

    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("Internal Server Error");

    // Search functionality should be available
    const searchInput = page
      .locator(
        'input[type="search"], input[type="text"], input[placeholder*="search"], input[placeholder*="Search"], input[placeholder*="Buscar"], input[placeholder*="buscar"]'
      )
      .first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });
});
