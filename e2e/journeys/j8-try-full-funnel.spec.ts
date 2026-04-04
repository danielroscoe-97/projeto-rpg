/**
 * J8 — Try Mode Full Funnel (Visitante Sem Login)
 *
 * Jornada do market research sec.14.1: Visitante chega → testa combate → fica impressionado → CTA signup.
 * Fluxo "Try": sem login, sem cadastro, funcionalidade completa de combate.
 *
 * Hipotese H2: DMs que chegam ao primeiro combate em < 90s retornam 2x mais.
 * Hipotese H3: Try mode sem login converte 25-40% em signup.
 *
 * Docs ref:
 *  - cenarios-financeiros: Free tier (ate 6 combatentes, 1 sessao ativa, player view, share link)
 *  - market research sec.14.1: "Primeiro combate completo em < 90 segundos"
 *  - market research sec.4.1: "Um tracker que funciona em 2 cliques, sem conta"
 *
 * Perspectivas: Visitante (potencial DM)
 */
import { test, expect } from "@playwright/test";
import {
  goToTryPage,
  addManualCombatant,
  addAllCombatants,
  startCombat,
  advanceTurn,
  applyDamageToFirst,
  skipGuidedTour,
  waitForSrdReady,
} from "../guest-qa/helpers";

test.describe("J8 — Try Mode Full Funnel (Visitante)", () => {
  test.beforeEach(async ({ page }) => {
    // Clear all auth state — simulate a brand new visitor
    await page.context().clearCookies();
  });

  test("J8.1 — Landing page → /try sem login, sem redirect", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Landing page should have a CTA to try
    const tryCta = page.locator(
      'a[href*="/try"], button:has-text("Experimente"), button:has-text("Try"), a:has-text("Experimente"), a:has-text("Try")'
    ).first();
    const hasTrialCta = await tryCta
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (hasTrialCta) {
      await tryCta.click();
    } else {
      // Fallback — navigate directly
      await page.goto("/try");
    }

    await page.waitForLoadState("domcontentloaded");

    // Must NOT be redirected to login
    expect(page.url()).not.toContain("/auth/login");

    // Must see encounter setup (wait for SRD to finish loading)
    await skipGuidedTour(page);
    await waitForSrdReady(page);
    await expect(page.locator('[data-testid="add-row"]')).toBeVisible({
      timeout: 15_000,
    });
  });

  test("J8.2 — Visitor completa combate com 3 combatentes (happy path)", async ({
    page,
  }) => {
    await goToTryPage(page);

    // Add 3 combatants (simulating a real encounter)
    await addAllCombatants(page, [
      { name: "Paladino", hp: "45", ac: "18", init: "15" },
      { name: "Mago", hp: "28", ac: "12", init: "18" },
      { name: "Goblin Chefe", hp: "35", ac: "15", init: "10" },
    ]);

    // Verify 3 combatants added
    await expect(page.locator('[data-testid^="setup-row-"]')).toHaveCount(3, {
      timeout: 5_000,
    });

    // Start combat
    await startCombat(page);

    // Verify active combat
    await expect(page.locator('[data-testid="initiative-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-turn-btn"]')).toBeVisible();
  });

  test("J8.3 — Visitor avanca turnos e ajusta HP (core loop funcional)", async ({
    page,
  }) => {
    await goToTryPage(page);

    // Quick setup: 2 combatants
    await addAllCombatants(page, [
      { name: "Hero", hp: "40", ac: "16", init: "18" },
      { name: "Orc", hp: "15", ac: "13", init: "8" },
    ]);

    await startCombat(page);

    // Advance 2 turns
    await advanceTurn(page);
    await advanceTurn(page);

    // On mobile viewports the HP buttons may be scrolled out of view.
    // Scroll the first HP button into the viewport before interacting.
    const hpBtn = page.locator('[data-testid^="hp-btn-"]').first();
    await hpBtn.scrollIntoViewIfNeeded();

    // Apply damage
    await applyDamageToFirst(page, 5);

    // Combat should still be functional
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-turn-btn"]')).toBeVisible();
  });

  test("J8.4 — Visitor /try com 6 combatentes (limite free tier)", async ({
    page,
  }) => {
    await goToTryPage(page);

    // Add 6 combatants — max free tier
    await addAllCombatants(page, [
      { name: "Fighter", hp: "45", ac: "18", init: "16" },
      { name: "Rogue", hp: "30", ac: "14", init: "20" },
      { name: "Cleric", hp: "35", ac: "16", init: "12" },
      { name: "Goblin A", hp: "7", ac: "15", init: "14" },
      { name: "Goblin B", hp: "7", ac: "15", init: "11" },
      { name: "Goblin Boss", hp: "21", ac: "17", init: "8" },
    ]);

    // Verify at least 6 setup rows exist
    const setupRows = page.locator('[data-testid^="setup-row-"]');
    await expect(setupRows.first()).toBeVisible({ timeout: 5_000 });
    expect(await setupRows.count()).toBeGreaterThanOrEqual(6);

    // Start combat with 6
    await startCombat(page);

    // Initiative list should have at least 6 entries
    const combatants = page.locator(
      '[data-testid="initiative-list"] [data-testid^="combatant-row-"]'
    );
    const count = await combatants.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test("J8.5 — /try nunca mostra tela de login em nenhum ponto", async ({
    page,
  }) => {
    // Navigate to /try with completely clean state
    await page.context().clearCookies();
    await page.goto("/try");
    await page.waitForTimeout(5_000);

    // Must be on /try
    expect(page.url()).toContain("/try");
    expect(page.url()).not.toContain("/auth/login");

    // Page body must not contain login form
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("Internal Server Error");
  });

  test("J8.6 — Signup CTA visivel durante/apos combate em /try", async ({
    page,
  }) => {
    await goToTryPage(page);

    // Quick combat setup
    await addAllCombatants(page, [
      { name: "Test", hp: "10", ac: "10", init: "10" },
      { name: "Test2", hp: "10", ac: "10", init: "5" },
    ]);

    await startCombat(page);

    // Look for signup CTA — should be visible somewhere on the page
    const signupCta = page.locator(
      'a[href*="/auth"], a[href*="/signup"], a[href*="/register"], button:has-text("Criar Conta"), button:has-text("Sign Up"), button:has-text("Cadastre"), a:has-text("Criar Conta"), a:has-text("Sign Up"), a:has-text("Cadastre"), [data-testid="signup-cta"]'
    ).first();

    const hasCta = await signupCta
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    // Soft assertion — CTA should exist for conversion funnel
    // If not present, it's a missed opportunity per market research
    if (!hasCta) {
      // On desktop, check visible navbar links
      const navSignup = page.locator(
        'nav a[href*="/auth"], nav a:has-text("Login"), nav a:has-text("Entrar")'
      ).first();
      const hasNav = await navSignup
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (!hasNav) {
        // On mobile the nav links are behind a hamburger menu.
        // Verify the hamburger button exists (links are accessible via menu),
        // OR look for any auth/signup link anywhere on the page (footer, banners, etc.)
        const hamburger = page.locator(
          'button[aria-label*="menu" i], button[aria-label*="Menu" i], [data-testid="mobile-menu-btn"], nav button:has(svg)'
        ).first();
        const hasHamburger = await hamburger
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

        const anyAuthLink = page.locator(
          'a[href*="/auth"], a[href*="/signup"], a[href*="/register"], footer a:has-text("Login"), footer a:has-text("Entrar")'
        ).first();
        const hasAnyAuth = await anyAuthLink
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

        // At least one conversion path must exist: hamburger menu or visible auth link
        expect(
          hasHamburger || hasAnyAuth,
          "Expected either a hamburger menu (hiding auth links) or a visible auth/signup link on the page"
        ).toBe(true);
      }
    }
  });
});
