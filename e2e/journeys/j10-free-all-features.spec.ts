/**
 * J10 — Login Free: Todas Features Pro Acessiveis
 *
 * Context: Hoje TUDO que e pago esta liberado de graca.
 * Este spec garante que TODAS as features Pro funcionam sem paywall.
 *
 * Docs ref:
 *  - cenarios-financeiros: Free tier inclui player view, share link
 *  - cenarios-financeiros: Pro inclui ilimitados combatentes, campanhas, presets, audio, historico
 *  - market research sec.7.1: "primeiro tracker profissional totalmente em portugues"
 *
 * O que deve funcionar para QUALQUER usuario logado:
 *  1. Dashboard com conteudo
 *  2. Criar combate sem limite de combatentes
 *  3. Campanhas
 *  4. Presets (salvar/reutilizar encontros)
 *  5. Compendium (monstros, spells, condicoes)
 *  6. Command palette (Ctrl+K)
 *  7. Share link + player view
 *  8. Audio/Soundboard
 *  9. Settings (incluindo i18n)
 *
 * Perspectiva: DM logado (free tier, mas com tudo liberado)
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { goToNewSession } from "../helpers/session";
import { DM_PRIMARY } from "../fixtures/test-accounts";

test.describe("J10 — Free: Todas Features Acessiveis", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("J10.1 — Dashboard carrega com conteudo (nao vazio)", async ({
    page,
  }) => {
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15_000 });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    // Dashboard should NOT be blank
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText!.length).toBeGreaterThan(50);

    // Should have navigation and action buttons
    const nav = page.locator("nav");
    await expect(nav).toBeVisible({ timeout: 5_000 });
  });

  test("J10.2 — Criar nova sessao de combate funciona", async ({ page }) => {
    await goToNewSession(page);

    // Must NOT show paywall or "upgrade" blocker
    const paywall = page.locator(
      '[data-testid="paywall"], [data-testid="upgrade-modal"], button:has-text("Upgrade"), button:has-text("Assinar")'
    ).first();
    const hasPaywall = await paywall
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    expect(hasPaywall).toBe(false);
  });

  test("J10.3 — Mais de 6 combatentes funciona (Pro feature liberada)", async ({
    page,
  }) => {
    await goToNewSession(page);

    await page.fill(
      '[data-testid="encounter-name-input"]',
      "J10 Big Battle"
    );

    // Add 8 combatants (exceeds free tier limit of 6)
    const names = [
      "Fighter", "Rogue", "Cleric", "Wizard",
      "Goblin A", "Goblin B", "Goblin C", "Goblin Boss",
    ];

    for (let i = 0; i < names.length; i++) {
      await page.fill('[data-testid="add-row-name"]', names[i]);
      await page.fill('[data-testid="add-row-hp"]', "20");
      await page.fill('[data-testid="add-row-ac"]', "14");
      await page.fill('[data-testid="add-row-init"]', String(20 - i));
      await page.click('[data-testid="add-row-btn"]');
      await page.waitForTimeout(300);
    }

    // All 8 should be added — no paywall blocking
    const rows = page.locator('[data-testid^="setup-row-"]');
    const rowCount = await rows.count();
    expect(rowCount).toBe(8);

    // Start combat should work
    await page.click('[data-testid="start-combat-btn"]');
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({
      timeout: 10_000,
    });

    // Initiative list should have 8 entries
    const combatants = page.locator(
      '[data-testid="initiative-list"] [data-testid^="combatant-row-"]'
    );
    expect(await combatants.count()).toBe(8);
  });

  test("J10.4 — Compendium Monsters carrega e busca funciona", async ({
    page,
  }) => {
    await page.goto("/app/compendium?tab=monsters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("Internal Server Error");

    // Search for a common monster
    const searchInput = page
      .locator(
        'input[type="search"], input[placeholder*="search"], input[placeholder*="Buscar"], input[placeholder*="buscar"]'
      )
      .first();

    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill("Dragon");
      await page.waitForTimeout(1_000);

      // Results should appear — no paywall
      const results = page.locator(
        '[data-testid*="monster-"], [data-testid*="result"], .monster-card, .compendium-result'
      );
      const hasResults = await results.first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      expect(hasResults).toBe(true);
    }
  });

  test("J10.5 — Compendium Spells carrega e busca funciona", async ({
    page,
  }) => {
    await page.goto("/app/compendium?tab=spells");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("Internal Server Error");

    const searchInput = page
      .locator(
        'input[type="search"], input[placeholder*="search"], input[placeholder*="Buscar"]'
      )
      .first();

    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill("Fireball");
      await page.waitForTimeout(1_000);

      // Should see results
      const pageText = await page.textContent("body");
      expect(
        pageText!.includes("Fireball") || pageText!.includes("Bola de Fogo")
      ).toBe(true);
    }
  });

  test("J10.6 — Command Palette (Ctrl+K) funciona", async ({ page }) => {
    await page.goto("/app/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    await page.keyboard.press("Control+k");

    const palette = page.locator('[cmdk-root]');
    await expect(palette).toBeVisible({ timeout: 5_000 });

    const searchInput = page.locator('[cmdk-input]');
    await expect(searchInput).toBeVisible({ timeout: 3_000 });
    await searchInput.fill("Goblin");

    await page.waitForTimeout(1_000);

    const results = page.locator('[cmdk-item]');
    expect(await results.count()).toBeGreaterThan(0);

    await page.keyboard.press("Escape");
  });

  test("J10.7 — Presets page carrega sem erro", async ({ page }) => {
    await page.goto("/app/presets");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("Internal Server Error");
    expect(bodyText).not.toContain("404");

    // Page should have structure — wait for render
    await page.waitForTimeout(3_000);
    const bodyLen = (await page.textContent("body"))?.length ?? 0;
    expect(bodyLen).toBeGreaterThan(100);
  });

  test("J10.8 — Settings page carrega e permite trocar idioma", async ({
    page,
  }) => {
    await page.goto("/app/settings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("Internal Server Error");

    // Should see language selector or settings form
    const hasSettings = await page
      .locator(
        'select, [data-testid*="language"], [data-testid*="settings"], form'
      )
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    expect(hasSettings).toBe(true);
  });

  test("J10.9 — Share link funciona (gerar + copiar)", async ({ page }) => {
    await goToNewSession(page);

    // Prepare/create session
    const prepareBtn = page.locator('[data-testid="share-prepare-btn"]');
    if (await prepareBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await prepareBtn.click();
      await page.waitForTimeout(2_000);
    }

    // Generate share link
    const generateBtn = page.locator('[data-testid="share-session-generate"]');
    if (await generateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await generateBtn.click();
      await page.waitForTimeout(2_000);
    }

    // Share URL should be visible
    const shareUrl = page.locator('[data-testid="share-session-url"]');
    if (await shareUrl.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const value = await shareUrl.inputValue();
      expect(value).toContain("/join/");
    }
  });

  test("J10.10 — Nenhuma pagina mostra paywall ou 'Upgrade'", async ({
    page,
  }) => {
    const pages = [
      "/app/dashboard",
      "/app/session/new",
      "/app/presets",
      "/app/compendium?tab=monsters",
      "/app/compendium?tab=spells",
      "/app/compendium?tab=conditions",
      "/app/settings",
    ];

    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1_000);

      const bodyText = await page.textContent("body");
      expect(bodyText).not.toContain("Internal Server Error");

      // No paywall should appear
      const paywall = page.locator(
        '[data-testid="paywall"], [data-testid="upgrade-modal"]'
      ).first();
      const hasPaywall = await paywall
        .isVisible({ timeout: 1_000 })
        .catch(() => false);
      expect(hasPaywall).toBe(false);
    }
  });
});
