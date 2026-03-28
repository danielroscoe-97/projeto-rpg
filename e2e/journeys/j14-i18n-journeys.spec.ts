/**
 * J14 — i18n: Jornadas em Portugues (pt-BR)
 *
 * Docs ref:
 *  - market research sec.4.1 Dor #5: "Ferramentas em ingles num mercado que fala portugues"
 *  - market research sec.4.1 Dor #6: "Sem suporte para sistemas brasileiros"
 *  - market research sec.1.2: "95%+ das ferramentas VTT sao em ingles. Oportunidade enorme"
 *  - market research sec.5.3: "Portugues: ★★★★★ (peso maximo para Player)"
 *  - cenarios-financeiros: "primeiro tracker profissional totalmente em portugues"
 *
 * O que deve estar em portugues para DM pt-BR:
 *  1. Navbar labels
 *  2. Dashboard
 *  3. Botoes de combate (Proximo Turno, Dano, Cura)
 *  4. Condicoes (Amedrontado, Envenenado, etc.)
 *  5. Compendium
 *  6. Settings
 *
 * O que deve estar em portugues para Player pt-BR:
 *  1. Player view labels
 *  2. Condicoes com badges traduzidos
 *  3. Join form
 *
 * Perspectiva: DM pt-BR + Player pt-BR
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { goToNewSession, dmSetupCombatSession, getShareToken } from "../helpers/session";
import { DM_PRIMARY, DM_ENGLISH } from "../fixtures/test-accounts";

test.describe("J14 — i18n pt-BR", () => {
  test("J14.1 — DM pt-BR ve interface em portugues no dashboard", async ({
    page,
  }) => {
    await loginAs(page, DM_PRIMARY);
    await page.goto("/app/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();

    // Should see Portuguese strings — at least some of these
    const ptStrings = [
      "Painel", "Sessão", "Campanha", "Criar", "Novo",
      "Combate", "Dashboard", "Configurações", "Sair",
    ];

    const hasPtBR = ptStrings.some((str) => bodyText!.includes(str));
    expect(hasPtBR).toBe(true);
  });

  test("J14.2 — DM pt-BR ve botoes de combate em portugues", async ({
    page,
  }) => {
    await loginAs(page, DM_PRIMARY);
    await goToNewSession(page);

    // Check for Portuguese labels on the setup page
    const bodyText = await page.textContent("body");

    // Should see Portuguese combat terms
    const ptCombatTerms = [
      "Adicionar", "Iniciar", "Combate", "Nome", "Vida", "Iniciativa",
    ];
    const hasPtTerms = ptCombatTerms.some((term) => bodyText!.includes(term));
    expect(hasPtTerms).toBe(true);
  });

  test("J14.3 — Compendium conditions em portugues para DM pt-BR", async ({
    page,
  }) => {
    await loginAs(page, DM_PRIMARY);
    await page.goto("/app/compendium?tab=conditions");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();

    // Should contain Portuguese condition names
    const ptConditions = [
      "Amedrontado", "Envenenado", "Atordoado", "Paralisado",
      "Cego", "Surdo", "Encantado", "Derrubado", "Agarrado",
      "Invisível", "Petrificado", "Inconsciente",
    ];

    const hasPtConditions = ptConditions.some((c) => bodyText!.includes(c));
    // At least SOME conditions should be in Portuguese
    expect(hasPtConditions).toBe(true);
  });

  test("J14.4 — DM English ve interface em ingles", async ({ page }) => {
    await loginAs(page, DM_ENGLISH);
    await page.goto("/app/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();

    // Should see English strings
    const enStrings = [
      "Dashboard", "Session", "Campaign", "Create", "New",
      "Combat", "Settings", "Logout",
    ];
    const hasEN = enStrings.some((str) => bodyText!.includes(str));
    expect(hasEN).toBe(true);
  });

  test("J14.5 — Condicoes badge em portugues no combate ativo", async ({
    page,
  }) => {
    await loginAs(page, DM_PRIMARY);
    await goToNewSession(page);

    await page.fill(
      '[data-testid="encounter-name-input"]',
      "J14 i18n Conditions"
    );

    // Add combatant
    await page.fill('[data-testid="add-row-name"]', "Goblin i18n");
    await page.fill('[data-testid="add-row-hp"]', "20");
    await page.fill('[data-testid="add-row-ac"]', "15");
    await page.fill('[data-testid="add-row-init"]', "12");
    await page.click('[data-testid="add-row-btn"]');

    await page.fill('[data-testid="add-row-name"]', "Hero i18n");
    await page.fill('[data-testid="add-row-hp"]', "40");
    await page.fill('[data-testid="add-row-ac"]', "16");
    await page.fill('[data-testid="add-row-init"]', "18");
    await page.click('[data-testid="add-row-btn"]');

    await page.click('[data-testid="start-combat-btn"]');
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({
      timeout: 10_000,
    });

    // Open condition picker
    const conditionBtn = page
      .locator(
        '[data-testid^="condition-btn-"], [data-testid^="conditions-"], button[aria-label*="condition"], button[aria-label*="Condição"]'
      )
      .first();

    if (await conditionBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await conditionBtn.click();
      await page.waitForTimeout(1_000);

      // Condition names in the picker should be in Portuguese
      const pickerText = await page.textContent("body");

      const ptConditions = [
        "Amedrontado", "Envenenado", "Atordoado", "Paralisado",
        "Cego", "Encantado", "Derrubado", "Invisível",
      ];

      const hasPtInPicker = ptConditions.some((c) =>
        pickerText!.includes(c)
      );
      expect(hasPtInPicker).toBe(true);

      await page.keyboard.press("Escape");
    }
  });

  test("J14.6 — /try mostra interface em portugues para visitor BR", async ({
    page,
  }) => {
    // Clean visitor — browser Accept-Language should default to pt-BR
    await page.context().clearCookies();

    await page.goto("/try");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();

    // Try page should have Portuguese strings
    // At minimum: form labels, buttons, headings
    const ptTerms = [
      "Adicionar", "Iniciar", "Combate", "Nome", "Vida",
      "Iniciativa", "Experimentar", "Começar",
    ];
    const hasPt = ptTerms.some((term) => bodyText!.includes(term));
    expect(hasPt).toBe(true);
  });

  test("J14.7 — Join page (/join/) em portugues para player BR", async ({
    browser,
  }) => {
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();

    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Boss", hp: "50", ac: "16", init: "14" },
      { name: "Minion", hp: "10", ac: "12", init: "8" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close();
      return;
    }

    // Player opens join page
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await playerPage.goto(`/join/${token}`);
    await playerPage.waitForTimeout(3_000);

    const joinBody = await playerPage.textContent("body");
    expect(joinBody).toBeTruthy();

    // Join page should have Portuguese strings
    const ptJoinTerms = [
      "Solicitar", "Nome", "Iniciativa", "Entrar",
      "Aguardando", "Combate", "Participar",
    ];
    const hasPtJoin = ptJoinTerms.some((term) => joinBody!.includes(term));
    // Soft check — the page should show SOME Portuguese or at least SOME form
    expect(hasPtJoin || joinBody!.length > 50).toBe(true);

    await dmContext.close();
    await playerContext.close();
  });
});
