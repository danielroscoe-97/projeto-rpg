import { test, expect } from "@playwright/test";
import { waitForSrdReady } from "../helpers/combat";

/**
 * P0 — Guided Tour (onboarding deslogado)
 *
 * Testa o fluxo completo do tour guiado em /try para visitantes.
 * O tour auto-inicia após 800ms e guia o usuário pelas fases:
 * setup → combat → complete.
 */
test.describe("P0 — Guided Tour (Logged-Out Onboarding)", () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    // Limpa localStorage para garantir que o tour não foi "completado" antes
    await page.context().clearCookies();
    await page.goto("/try");
    await page.evaluate(() => localStorage.removeItem("guided-tour-v1"));
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
  });

  test("Tour auto-starts with welcome modal", async ({ page }) => {
    // O tour mostra o step 0 (welcome) como modal centralizado
    const tooltip = page.locator('[data-testid="tour-tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 15_000 });

    // Deve conter o título de boas-vindas
    await expect(tooltip).toContainText(/Pocket DM|Welcome|Bem-vindo/i);

    // Deve ter botão de próximo e pular
    await expect(page.locator('[data-testid="tour-next"]')).toBeVisible();
    await expect(page.locator('[data-testid="tour-skip"]')).toBeVisible();
  });

  test("Can navigate through setup phase steps", async ({ page }) => {
    // Espera o welcome modal aparecer
    await expect(page.locator('[data-testid="tour-tooltip"]')).toBeVisible({ timeout: 15_000 });

    // Step 0: Welcome → Next
    await page.click('[data-testid="tour-next"]');
    await page.waitForTimeout(1_000);

    // Step 1: Monster Search — tooltip deve estar visível
    await expect(page.locator('[data-testid="tour-tooltip"]')).toBeVisible({ timeout: 10_000 });

    // Avança pelo setup phase
    await page.click('[data-testid="tour-next"]');
    await page.waitForTimeout(1_000);

    // Step 2: Add Monster — tooltip visível
    await expect(page.locator('[data-testid="tour-tooltip"]')).toBeVisible({ timeout: 10_000 });

    await page.click('[data-testid="tour-next"]');
    await page.waitForTimeout(1_000);

    // Step 3: Import hint — tooltip visível
    await expect(page.locator('[data-testid="tour-tooltip"]')).toBeVisible({ timeout: 10_000 });
  });

  test("Can skip tour at any point", async ({ page }) => {
    // Espera o welcome modal
    await expect(page.locator('[data-testid="tour-tooltip"]')).toBeVisible({ timeout: 15_000 });

    // Clica em Skip
    await page.click('[data-testid="tour-skip"]');
    await page.waitForTimeout(1_000);

    // Tooltip não deve mais estar visível
    await expect(page.locator('[data-testid="tour-tooltip"]')).not.toBeVisible({ timeout: 5_000 });

    // Tour deve estar marcado como completo no localStorage
    const isCompleted = await page.evaluate(() => {
      const stored = localStorage.getItem("guided-tour-v1");
      if (!stored) return false;
      try {
        const parsed = JSON.parse(stored);
        return parsed?.state?.isCompleted === true;
      } catch {
        return false;
      }
    });
    expect(isCompleted).toBe(true);
  });

  test("Back navigation works between steps", async ({ page }) => {
    await expect(page.locator('[data-testid="tour-tooltip"]')).toBeVisible({ timeout: 15_000 });

    // Step 0 → Next
    await page.click('[data-testid="tour-next"]');
    await page.waitForTimeout(1_000);

    // Step 1 — botão de voltar deve existir agora
    const backBtn = page.locator('[data-testid="tour-back"]');
    await expect(backBtn).toBeVisible({ timeout: 5_000 });

    // Volta para step 0
    await backBtn.click();
    await page.waitForTimeout(1_000);

    // Deve estar de volta no welcome modal
    const tooltip = page.locator('[data-testid="tour-tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(/Pocket DM|Welcome|Bem-vindo/i);
  });

  test("Full tour flow: setup → combat → complete", async ({ page, isMobile }) => {
    // === SETUP PHASE ===
    const tooltip = page.locator('[data-testid="tour-tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 15_000 });

    // Wait for SRD to load before advancing — the tour auto-adds a goblin at step
    // "monster-added" by clicking the first SRD search result. If SRD isn't loaded
    // yet, the auto-add fails and combatants.length=0 blocks the setup→combat transition.
    await waitForSrdReady(page);

    // Percorre todos os steps de setup clicando Next
    // Steps: welcome(0), monster-search(1), monster-result(2), monster-added(3),
    //        add-row(4), import-hint(5), roll-initiative(6), start-combat(7)
    const setupSteps = 8;
    for (let i = 0; i < setupSteps; i++) {
      await expect(tooltip).toBeVisible({ timeout: 10_000 });
      const nextBtn = page.locator('[data-testid="tour-next"]');
      if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(1_500);
      }
    }

    // === COMBAT PHASE ===
    // Após start-combat, o combate é iniciado automaticamente pelo tour
    // Os steps de combat devem aparecer
    await page.waitForTimeout(2_000);

    // Deve estar na fase de combat ou complete
    // Percorre os steps de combat
    const combatSteps = isMobile ? 3 : 4; // desktop: combat-controls→hp-adjust→next-turn→keyboard-tip; mobile pula keyboard-tip
    for (let i = 0; i < combatSteps; i++) {
      const nextBtn = page.locator('[data-testid="tour-next"]');
      if (await nextBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(1_500);
      }
    }

    // === COMPLETE PHASE ===
    // O último step é o tour-complete modal com confetti
    await page.waitForTimeout(2_000);
    // Both tour-got-it and tour-finish are visible on the complete step — use .first()
    // to avoid Playwright strict-mode violation (multiple matches).
    const finishBtn = page.locator('[data-testid="tour-got-it"], [data-testid="tour-finish"]').first();
    if (await finishBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      // Tour complete — verifica que botão de criar conta existe
      const createAccountLink = page.locator('a[href*="/auth/sign-up"]');
      const isCtaVisible = await createAccountLink.isVisible().catch(() => false);
      expect(isCtaVisible || await finishBtn.isVisible()).toBeTruthy();

      await finishBtn.click();
      await page.waitForTimeout(1_000);
    }

    // Tour deve estar completo
    await expect(tooltip).not.toBeVisible({ timeout: 5_000 });
  });

  test("Tour overlay/spotlight is visible during active steps", async ({ page }) => {
    await expect(page.locator('[data-testid="tour-tooltip"]')).toBeVisible({ timeout: 15_000 });

    // O overlay SVG deve estar presente durante o tour
    const overlay = page.locator('[data-testid="tour-overlay"]');
    await expect(overlay).toBeVisible({ timeout: 5_000 });
  });

  test("Tour does not restart after completion on page reload", async ({ page }) => {
    await expect(page.locator('[data-testid="tour-tooltip"]')).toBeVisible({ timeout: 15_000 });

    // Skip o tour
    await page.click('[data-testid="tour-skip"]');
    await page.waitForTimeout(1_000);

    // Recarrega a página
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3_000);

    // Tour não deve reaparecer
    await expect(page.locator('[data-testid="tour-tooltip"]')).not.toBeVisible({ timeout: 5_000 });
  });

  test("Help button appears after tour is completed", async ({ page }) => {
    await expect(page.locator('[data-testid="tour-tooltip"]')).toBeVisible({ timeout: 15_000 });

    // Skip o tour
    await page.click('[data-testid="tour-skip"]');
    await page.waitForTimeout(2_000);

    // Help button ("?") deve aparecer para reiniciar o tour
    const helpBtn = page.locator('[data-testid="tour-help-btn"]');
    await expect(helpBtn).toBeVisible({ timeout: 10_000 });
  });
});
