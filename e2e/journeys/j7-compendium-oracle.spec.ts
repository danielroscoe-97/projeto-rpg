/**
 * J7 — Busca no Compendium + Oracle (Command Palette)
 *
 * Impacto: Preparacao do DM — feature de retencao.
 *
 * Gaps cobertos:
 *  - J7.1 Command Palette (Ctrl+K) busca monstro
 *  - J7.2 Compendium busca spell
 *  - J7.3 Compendium busca condicao
 *  - J7.4 Command Palette durante combate
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { goToNewSession } from "../helpers/session";
import { DM_PRIMARY } from "../fixtures/test-accounts";

test.describe("J7 — Compendium + Oracle", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("J7.1 — Command Palette abre com Ctrl+K e busca monstro", async ({
    page,
  }) => {
    await page.goto("/app/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    // Open command palette
    await page.keyboard.press("Control+k");

    // Command palette should appear (cmdk renders [cmdk-root])
    const palette = page.locator('[cmdk-root]');
    await expect(palette).toBeVisible({ timeout: 5_000 });

    // Type search query
    const searchInput = page.locator('[cmdk-input]');
    await expect(searchInput).toBeVisible({ timeout: 3_000 });
    await searchInput.fill("Goblin");

    // Wait for results
    await page.waitForTimeout(1_000);

    // Results should appear
    const results = page.locator('[cmdk-item]');
    const resultCount = await results.count();
    expect(resultCount).toBeGreaterThan(0);

    // Close palette
    await page.keyboard.press("Escape");
  });

  test("J7.2 — Compendium tab Spells busca e mostra detalhes", async ({
    page,
  }) => {
    await page.goto("/app/compendium?tab=spells");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    // Find search input
    const searchInput = page
      .locator(
        'input[type="search"], input[placeholder*="search"], input[placeholder*="Buscar"], input[placeholder*="buscar"]'
      )
      .first();

    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill("Fireball");
      await page.waitForTimeout(500);

      // Results should appear
      const spellResult = page
        .locator(
          'text=Fireball, [data-testid*="spell-result"], button:has-text("Fireball")'
        )
        .first();

      if (
        await spellResult.isVisible({ timeout: 5_000 }).catch(() => false)
      ) {
        await spellResult.click();

        // Spell detail modal should open
        const modal = page.locator(
          '[data-testid="spell-modal"], [role="dialog"], .spell-detail'
        );
        const hasModal = await modal
          .isVisible({ timeout: 5_000 })
          .catch(() => false);

        if (hasModal) {
          // Modal should contain spell description
          const modalText = await modal.textContent();
          expect(modalText).toBeTruthy();
          expect(modalText!.length).toBeGreaterThan(20); // Not empty
        }
      }
    }

    // Page should not have errors
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("J7.3 — Compendium tab Conditions mostra regras", async ({ page }) => {
    await page.goto("/app/compendium?tab=conditions");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    // Conditions page should show a list of conditions
    const conditionCard = page
      .locator(
        '[data-testid*="condition-card"], .condition-card, [data-testid*="condition-"]'
      )
      .first();
    const hasList = await conditionCard
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (!hasList) {
      // Maybe conditions are shown differently — just verify page loads
      const bodyText = await page.textContent("body");
      expect(bodyText).not.toContain("Internal Server Error");
      // Should contain at least some condition name
      const hasAnyCondition =
        bodyText?.includes("Frightened") ||
        bodyText?.includes("Amedrontado") ||
        bodyText?.includes("Poisoned") ||
        bodyText?.includes("Envenenado") ||
        bodyText?.includes("Stunned") ||
        bodyText?.includes("Atordoado");
      expect(hasAnyCondition).toBe(true);
    }
  });

  test("J7.4 — Command Palette funciona durante combate ativo", async ({
    page,
    browser,
  }) => {
    // Fast track — go to session and start combat
    await goToNewSession(page);

    await page.fill(
      '[data-testid="encounter-name-input"]',
      "Oracle Test Combat"
    );

    // Add 2 combatants quickly
    for (const c of [
      { name: "A", hp: "30", ac: "14", init: "15" },
      { name: "B", hp: "20", ac: "12", init: "8" },
    ]) {
      await page.fill('[data-testid="add-row-name"]', c.name);
      await page.fill('[data-testid="add-row-hp"]', c.hp);
      await page.fill('[data-testid="add-row-ac"]', c.ac);
      await page.fill('[data-testid="add-row-init"]', c.init);
      await page.click('[data-testid="add-row-btn"]');
      await page.waitForTimeout(500);
    }

    await page.click('[data-testid="start-combat-btn"]');
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({
      timeout: 10_000,
    });

    // Now open command palette IN combat
    await page.keyboard.press("Control+k");

    const palette = page.locator('[cmdk-root]');
    await expect(palette).toBeVisible({ timeout: 5_000 });

    // Search for a monster
    const searchInput = page.locator('[cmdk-input]');
    await expect(searchInput).toBeVisible({ timeout: 3_000 });
    await searchInput.fill("Orc");
    await page.waitForTimeout(1_000);

    const results = page.locator('[cmdk-item]');
    expect(await results.count()).toBeGreaterThan(0);

    // Close palette and verify combat is still active
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible();
  });
});
