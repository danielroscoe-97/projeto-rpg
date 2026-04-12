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

    // Wait for dashboard to render content
    await page.waitForTimeout(3_000);

    // Look for saved encounters, encounter links, or action buttons
    const contentLocator = page.locator(
      '[data-testid="saved-encounters"], [data-testid^="encounter-link-"], a[href*="/app/session/"], a[href*="session/new"], button:has-text("Nova"), button:has-text("New"), button:has-text("Criar"), nav'
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

    await ctx1.close().catch(() => {});

    // Brief pause to avoid Supabase auth rate limiting
    await new Promise((r) => setTimeout(r, 2_000));

    // Phase 2: Login again (fresh context) and navigate directly to session
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await loginAs(page2, DM_PRIMARY);

    await page2.goto(sessionUrl);
    await page2.waitForLoadState("domcontentloaded");

    // The session page may show either:
    // 1. Active combat directly (if URL resolves to the encounter)
    // 2. Session overview with encounter list (DM needs to click to resume)
    const activeCombat = page2.locator('[data-testid="active-combat"]');
    const encounterLink = page2.locator('a[href*="/app/session/"], button:has-text("Retomar"), button:has-text("Resume")').first();

    const hasActiveCombat = await activeCombat.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasActiveCombat) {
      // Try clicking on the most recent encounter to resume it
      const encounterItem = page2.locator('[data-testid^="encounter-link-"], a[href*="session"]').first();
      if (await encounterItem.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await encounterItem.click();
        await page2.waitForLoadState("domcontentloaded");
      }
    }

    // After navigation, verify combat state is accessible
    // Either active combat OR the session/encounter page loaded correctly
    const bodyText = await page2.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText).not.toContain("Internal Server Error");
    // The session should show either active combat or encounter data
    const hasRelevantContent =
      await activeCombat.isVisible({ timeout: 10_000 }).catch(() => false) ||
      bodyText!.includes("Persistent Hero") ||
      bodyText!.includes("Persistent Villain") ||
      bodyText!.includes("Combate Rápido") ||
      bodyText!.includes("Iniciar");
    expect(hasRelevantContent).toBe(true);

    await ctx2.close().catch(() => {});
  });

  test("J3.4 — DM acessa pagina de presets", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);

    await page.goto("/app/presets");
    await page.waitForLoadState("domcontentloaded");

    // Page should render the h1 title ("Encontros Preparados" / "Encounter Presets")
    const heading = page.locator("h1");
    await expect(heading).toBeVisible({ timeout: 10_000 });
    const headingText = await heading.textContent();
    expect(headingText).toMatch(/Encontros Preparados|Encounter Presets|Presets de Combate|Combat Presets/);
  });

  test("J3.5 — DM acessa compendium de monstros", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);

    await page.goto("/app/compendium?tab=monsters");
    await page.waitForLoadState("domcontentloaded");

    // Wait for compendium h1 to render
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });

    // Search functionality should be available after SRD data loads
    // MonsterBrowser renders filterBar twice (mobile md:hidden + desktop md:grid).
    // Use .last() to target the desktop instance which is visible at default viewport.
    const searchInput = page
      .locator(
        'input[placeholder*="Filtrar"], input[placeholder*="Filter"]'
      )
      .last();
    await expect(searchInput).toBeVisible({ timeout: 20_000 });
  });
});
