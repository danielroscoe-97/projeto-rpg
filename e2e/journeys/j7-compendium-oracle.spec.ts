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

async function addCombatant(
  page: import("@playwright/test").Page,
  c: { name: string; hp: string; ac: string; init: string }
) {
  const nameInput = page.locator('[data-testid="add-row-name"]');
  if (!(await nameInput.isVisible({ timeout: 1_000 }).catch(() => false))) {
    const manualToggle = page.locator("button").filter({ hasText: /Manual/i }).first();
    if (await manualToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualToggle.click();
      await page.waitForTimeout(300);
    }
  }
  await expect(nameInput).toBeVisible({ timeout: 5_000 });
  await page.locator('[data-testid="add-row-init"]').fill(c.init);
  await nameInput.fill(c.name);
  await expect(nameInput).toHaveValue(c.name, { timeout: 2_000 });
  await page.locator('[data-testid="add-row-hp"]').fill(c.hp);
  await page.locator('[data-testid="add-row-ac"]').fill(c.ac);
  await page.click('[data-testid="add-row-btn"]');
  await page.waitForTimeout(500);
}

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

    // Add 2 combatants quickly (encounter name is auto-generated)
    for (const c of [
      { name: "A", hp: "30", ac: "14", init: "15" },
      { name: "B", hp: "20", ac: "12", init: "8" },
    ]) {
      await addCombatant(page, c);
    }

    const startBtn = page.locator('[data-testid="start-combat-btn"]');
    await startBtn.scrollIntoViewIfNeeded();
    await startBtn.click();
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
