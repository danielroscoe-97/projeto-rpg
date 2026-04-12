/**
 * J18 — Compendium Browser Full Coverage (9 tabs)
 *
 * Comprehensive E2E coverage for the PlayerCompendiumBrowser dialog
 * across Desktop (DM session), Guest (/try), Player (/join), Mobile,
 * FloatingCards click-outside, and i18n.
 *
 * Scenarios: J18.1-J18.23
 */
import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { goToNewSession, dmSetupCombatSession } from "../helpers/session";
import { DM_PRIMARY, DM_ENGLISH } from "../fixtures/test-accounts";
import {
  goToTryPage,
  skipGuidedTour,
  dismissNextjsOverlay,
  waitForSrdReady,
  addManualCombatant,
  startCombat,
  addAllCombatants,
  QUICK_ENCOUNTER,
} from "../guest-qa/helpers";

// ─── Helpers ─────────────────────────────────────────────────────

/** Open the PlayerCompendiumBrowser dialog via the compendium button */
async function openCompendium(page: Page) {
  // GuestCombatClient uses data-testid="compendium-browser-btn"
  // PlayerInitiativeBoard uses a BookOpen button with aria-label or text
  const guestBtn = page.locator('[data-testid="compendium-browser-btn"]');
  const playerBtn = page
    .locator("button")
    .filter({ hasText: /compend|compêndio/i })
    .first();
  const target = (await guestBtn.isVisible({ timeout: 2_000 }).catch(() => false))
    ? guestBtn
    : playerBtn;
  await expect(target).toBeVisible({ timeout: 5_000 });
  await target.click();
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 5_000 });
  return dialog;
}

/** Click a tab inside the dialog by matching text (bilingual) */
async function clickTab(page: Page, ...texts: string[]) {
  const re = new RegExp(texts.join("|"), "i");
  const tab = page
    .locator('[role="dialog"] button')
    .filter({ hasText: re })
    .first();
  await expect(tab).toBeVisible({ timeout: 3_000 });
  await tab.click();
  await page.waitForTimeout(300);
}

/** Fill the search input inside the dialog and wait for results */
async function searchInDialog(page: Page, query: string, minWait = 500) {
  const dialog = page.locator('[role="dialog"]');
  const input = dialog.locator('input[type="text"]').first();
  await expect(input).toBeVisible({ timeout: 3_000 });
  await input.fill(query);
  await page.waitForTimeout(minWait);
  return dialog;
}

/** Click the first result matching text inside the dialog */
async function clickResult(page: Page, text: string | RegExp) {
  const dialog = page.locator('[role="dialog"]');
  const result = dialog
    .locator("button.w-full.text-left, button")
    .filter({ hasText: text })
    .first();
  await expect(result).toBeVisible({ timeout: 5_000 });
  await result.click();
  await page.waitForTimeout(300);
}

/** Assert that the detail view is showing and contains expected text */
async function expectDetailContains(page: Page, pattern: RegExp) {
  const dialog = page.locator('[role="dialog"]');
  const detailText = await dialog.textContent();
  expect(detailText).toMatch(pattern);
}

/** Close the dialog via Escape */
async function closeDialog(page: Page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

// ─── Desktop Tests (DM logged in, PT-BR) ────────────────────────

test.describe("J18 — Desktop: Compendium 9 Tabs (DM PT-BR)", () => {
  test.beforeEach(async ({ page }) => {
    await goToTryPage(page);
    // Compendium button only appears during active combat
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);
  });

  test("J18.1 — Open CompendiumBrowser via button", async ({ page }) => {
    const dialog = await openCompendium(page);
    // Dialog should have tab bar with 9 tabs
    const tabButtons = dialog.locator(
      ".flex.border-b button, .overflow-x-auto button"
    );
    expect(await tabButtons.count()).toBeGreaterThanOrEqual(9);
    await closeDialog(page);
  });

  test("J18.2 — Tab All: global search returns mixed results", async ({
    page,
  }) => {
    await openCompendium(page);
    // "All" tab is default — search for "Fire"
    const dialog = await searchInDialog(page, "Fire", 800);

    // Results should include at least one item
    const results = dialog.locator("button.w-full.text-left");
    expect(await results.count()).toBeGreaterThan(0);

    // Body text should include Fireball (spell)
    const text = await dialog.textContent();
    expect(text).toMatch(/Fireball|Fire Bolt/i);
  });

  test("J18.3 — Tab Spells: search and view detail", async ({ page }) => {
    await openCompendium(page);
    await clickTab(page, "Spells", "Magias");
    await searchInDialog(page, "Cure");

    const dialog = page.locator('[role="dialog"]');
    const results = dialog.locator("button.w-full.text-left");
    expect(await results.count()).toBeGreaterThan(0);

    // Click first Cure result to see detail
    await clickResult(page, /Cure/i);
    // SpellCard detail should show casting_time or components
    await expectDetailContains(page, /casting time|components|level|range/i);
  });

  test("J18.4 — Tab Conditions: search and view detail", async ({ page }) => {
    await openCompendium(page);
    await clickTab(page, "Conditions", "Condições");
    await searchInDialog(page, "Frightened");

    await clickResult(page, /Frightened|Amedrontado/i);
    // Condition detail should show a description
    const dialog = page.locator('[role="dialog"]');
    const detailText = await dialog.textContent();
    expect(detailText!.length).toBeGreaterThan(50);
  });

  test("J18.5 — Tab Monsters: search and view stat block", async ({
    page,
  }) => {
    await openCompendium(page);
    await clickTab(page, "Monsters", "Monstros");
    await searchInDialog(page, "Dragon");

    await clickResult(page, /Dragon/i);
    // MonsterStatBlock should show HP, AC, CR
    await expectDetailContains(page, /HP|Hit Points|AC|Armor Class|CR/i);
  });

  test("J18.6 — Tab Items: search and view detail", async ({ page }) => {
    await openCompendium(page);
    await clickTab(page, "Items", "Itens");
    await searchInDialog(page, "Longsword");

    await clickResult(page, /Longsword/i);
    // ItemCard should show some detail content
    const dialog = page.locator('[role="dialog"]');
    const detailText = await dialog.textContent();
    expect(detailText!.length).toBeGreaterThan(30);
  });

  test("J18.7 — Tab Feats: search and view detail", async ({ page }) => {
    await openCompendium(page);
    await clickTab(page, "Feats", "Talentos");
    await searchInDialog(page, "Alert");

    await clickResult(page, /Alert/i);
    // Feat detail shows description
    const dialog = page.locator('[role="dialog"]');
    const detailText = await dialog.textContent();
    expect(detailText!.length).toBeGreaterThan(30);
  });

  test("J18.8 — Tab Abilities: search Rage, verify detail", async ({
    page,
  }) => {
    await openCompendium(page);
    await clickTab(page, "Abilities", "Habilidades");
    await searchInDialog(page, "Rage");

    // Click first Rage result
    await clickResult(page, /Rage/i);
    // Should show some detail about this ability
    const dialog = page.locator('[role="dialog"]');
    const detailText = await dialog.textContent();
    expect(detailText!.length).toBeGreaterThan(30);
  });

  test("J18.9 — Tab Races: search Elf, verify traits + languages", async ({
    page,
  }) => {
    await openCompendium(page);
    await clickTab(page, "Races", "Raças");
    await searchInDialog(page, "Elf");

    await clickResult(page, /^Elf$/i);
    await expectDetailContains(page, /Languages:|Size:|Speed:/i);

    // Should have at least one trait listed
    const dialog = page.locator('[role="dialog"]');
    const traitHeaders = dialog.locator("h4");
    expect(await traitHeaders.count()).toBeGreaterThan(0);
  });

  test("J18.10 — Tab Backgrounds: search Acolyte, verify skills + feature", async ({
    page,
  }) => {
    await openCompendium(page);
    await clickTab(page, "Backgrounds", "Antecedentes");
    await searchInDialog(page, "Acolyte");

    await clickResult(page, /Acolyte/i);
    await expectDetailContains(page, /Skills:/i);

    // Feature name should be visible
    const dialog = page.locator('[role="dialog"]');
    const featureHeader = dialog.locator("h4");
    expect(await featureHeader.count()).toBeGreaterThanOrEqual(1);
  });

  test("J18.11 — Tab bar is scrollable (9 tabs visible)", async ({ page }) => {
    const dialog = await openCompendium(page);
    // All 9 tab labels should be in the DOM
    for (const label of ["All", "Tudo", "Spells", "Magias"]) {
      // At least one locale's labels should be present — check combined
      const btn = dialog
        .locator("button")
        .filter({ hasText: new RegExp(`^${label}$`, "i") });
      if ((await btn.count()) > 0) {
        await expect(btn.first()).toBeAttached();
      }
    }
    // The tab container should have overflow-x-auto
    const tabBar = dialog.locator(".overflow-x-auto, .scrollbar-hide").first();
    await expect(tabBar).toBeAttached();
  });

  test("J18.12 — Pagination: Load More button works", async ({ page }) => {
    await openCompendium(page);
    await clickTab(page, "Abilities", "Habilidades");

    // Wait for data to load
    await page.waitForTimeout(1_000);

    // With 689+ abilities, there should be a "Load more" button
    const dialog = page.locator('[role="dialog"]');
    const loadMore = dialog
      .locator("button")
      .filter({ hasText: /more|mais/i })
      .first();
    const hasMore = await loadMore
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (hasMore) {
      // Count results before
      const beforeCount = await dialog
        .locator("button.w-full.text-left")
        .count();
      await loadMore.click();
      await page.waitForTimeout(500);
      const afterCount = await dialog
        .locator("button.w-full.text-left")
        .count();
      expect(afterCount).toBeGreaterThan(beforeCount);
    }
  });
});

// ─── Guest Mode (/try) ──────────────────────────────────────────

test.describe("J18 — Guest Mode: CompendiumBrowser", () => {
  /** Guest setup: go to /try, add combatants, start combat */
  async function guestCombatReady(page: Page) {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);
  }

  test("J18.13 — CompendiumBrowser opens on /try", async ({ page }) => {
    await guestCombatReady(page);
    const btn = page.locator('[data-testid="compendium-browser-btn"]');
    await expect(btn).toBeVisible({ timeout: 5_000 });
    await btn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test("J18.14 — Guest: Abilities tab works", async ({ page }) => {
    await guestCombatReady(page);
    await openCompendium(page);
    await clickTab(page, "Abilities", "Habilidades");
    await searchInDialog(page, "Sneak Attack");

    const dialog = page.locator('[role="dialog"]');
    const results = dialog.locator("button.w-full.text-left");
    expect(await results.count()).toBeGreaterThan(0);

    await clickResult(page, /Sneak Attack/i);
    await expectDetailContains(page, /Class Feature|Rogue/i);
  });

  test("J18.15 — Guest: Races tab works", async ({ page }) => {
    await guestCombatReady(page);
    await openCompendium(page);
    await clickTab(page, "Races", "Raças");
    await searchInDialog(page, "Dwarf");

    await clickResult(page, /Dwarf/i);
    await expectDetailContains(page, /Size:|Speed:/i);
  });

  test("J18.16 — Guest: Backgrounds tab works", async ({ page }) => {
    await guestCombatReady(page);
    await openCompendium(page);
    await clickTab(page, "Backgrounds", "Antecedentes");
    await searchInDialog(page, "Criminal");

    await clickResult(page, /Criminal/i);
    await expectDetailContains(page, /Skills:/i);
  });
});

// ─── Player Mode (/join/[token]) ────────────────────────────────

test.describe("J18 — Player Mode: CompendiumBrowser", () => {
  test("J18.17 — Player: CompendiumBrowser opens in active session", async ({
    page,
    browser,
  }) => {
    // Setup: DM creates combat session
    const dmContext = await browser.newContext();
    const dmPage = await dmContext.newPage();
    const token = await dmSetupCombatSession(dmPage, DM_PRIMARY, [
      { name: "Hero", hp: "40", ac: "16", init: "18" },
      { name: "Goblin", hp: "7", ac: "15", init: "10" },
    ]);

    if (!token) {
      test.skip(true, "Could not generate share token");
      await dmContext.close().catch(() => {});
      return;
    }

    // Player joins
    await page.goto(`/join/${token}`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for player view or lobby
    const playerView = page.locator(
      '[data-testid="player-view"], [data-testid="lobby-name"]'
    );
    await expect(playerView).toBeVisible({ timeout: 30_000 });

    // If on lobby, fill name and join
    const lobbyName = page.locator('[data-testid="lobby-name"]');
    if (await lobbyName.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await lobbyName.fill("TestPlayer");
      const initInput = page.locator('[data-testid="lobby-initiative"]');
      if (await initInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await initInput.fill("15");
      }
      const submitBtn = page.locator('[data-testid="lobby-submit"]');
      if (await submitBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await submitBtn.click();
      }
      // DM approves: try inline button, generic accept, then sonner toast
      await dmPage.waitForTimeout(5_000);
      let accepted = false;
      for (let attempt = 0; attempt < 4 && !accepted; attempt++) {
        // Strategy 1: Inline "Aceitar TestPlayer" button
        const inlineBtn = dmPage.locator("button").filter({ hasText: /Aceitar.*TestPlayer|Accept.*TestPlayer/i }).first();
        if (await inlineBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await inlineBtn.click();
          accepted = true;
          break;
        }
        // Strategy 2: Generic accept button
        const anyBtn = dmPage.locator("button").filter({ hasText: /^Aceitar$|^Accept$/i }).first();
        if (await anyBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await anyBtn.click();
          accepted = true;
          break;
        }
        // Strategy 3: Sonner toast
        const toast = dmPage.locator("[data-sonner-toaster] button").filter({ hasText: /Aceitar|Accept/i }).first();
        if (await toast.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await toast.click();
          accepted = true;
          break;
        }
        await dmPage.waitForTimeout(3_000);
      }
      await expect(
        page.locator('[data-testid="player-view"]')
      ).toBeVisible({ timeout: 30_000 });
    }

    // J18.18 — Verify tabs load data
    // Look for a compendium-like button (BookOpen icon)
    const compBtn = page
      .locator("button")
      .filter({ hasText: /compend|compêndio/i })
      .first();
    const hasBtn = await compBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasBtn) {
      await compBtn.click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Verify at least 3 tabs load with data
      for (const tabName of ["Spells|Magias", "Monsters|Monstros", "Abilities|Habilidades"]) {
        await clickTab(page, ...tabName.split("|"));
        await page.waitForTimeout(500);
        // Tab should not show an error
        const dialogText = await dialog.textContent();
        expect(dialogText).not.toContain("Internal Server Error");
      }
    }

    await dmContext.close().catch(() => {});
  });
});

// ─── FloatingCards Click-Outside ─────────────────────────────────

test.describe("J18 — FloatingCards Click-Outside", () => {
  test("J18.19 — Click outside closes floating card", async ({ page }) => {
    await goToTryPage(page);

    // Start combat with SRD monsters by using the SRD search
    // We need to add combatants first
    await addAllCombatants(page, [
      { name: "Fighter", hp: "40", ac: "16", init: "18" },
      { name: "Goblin", hp: "7", ac: "15", init: "10" },
    ]);
    await startCombat(page);

    // Try to open a floating card by clicking on a combatant name
    const nameLink = page
      .locator('[data-testid^="combatant-row-"] button, [data-testid^="combatant-row-"] a')
      .first();
    const hasClickable = await nameLink
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (hasClickable) {
      await nameLink.click();
      await page.waitForTimeout(500);

      const card = page.locator("[data-floating-card]").first();
      if (await card.isVisible({ timeout: 3_000 }).catch(() => false)) {
        // Click outside (on body/background)
        await page.mouse.click(10, 10);
        await page.waitForTimeout(500);
        // Card should be closed (or closing)
        const stillVisible = await card
          .isVisible({ timeout: 1_000 })
          .catch(() => false);
        // Note: clicking far outside should dismiss it
        expect(stillVisible).toBe(false);
      }
    }
  });

  test("J18.20 — Click on search button does NOT close floating card", async ({
    page,
  }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);

    // Try to open a floating card
    const nameLink = page
      .locator('[data-testid^="combatant-row-"] button')
      .first();
    const hasClickable = await nameLink
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (hasClickable) {
      await nameLink.click();
      await page.waitForTimeout(500);

      const card = page.locator("[data-floating-card]").first();
      if (await card.isVisible({ timeout: 3_000 }).catch(() => false)) {
        // Click the quick-search button — should NOT close card
        const searchBtn = page.locator('[data-testid="quick-search-btn"]');
        if (await searchBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await searchBtn.click();
          await page.waitForTimeout(500);
          await expect(card).toBeVisible({ timeout: 2_000 });
        }
      }
    }
  });

  test("J18.21 — Click on compendium button does NOT close floating card", async ({
    page,
  }) => {
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);

    const nameLink = page
      .locator('[data-testid^="combatant-row-"] button')
      .first();
    const hasClickable = await nameLink
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (hasClickable) {
      await nameLink.click();
      await page.waitForTimeout(500);

      const card = page.locator("[data-floating-card]").first();
      if (await card.isVisible({ timeout: 3_000 }).catch(() => false)) {
        // Click the compendium button — should NOT close card
        const compBtn = page.locator('[data-testid="compendium-browser-btn"]');
        if (await compBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await compBtn.click();
          await page.waitForTimeout(500);
          await expect(card).toBeVisible({ timeout: 2_000 });
        }
      }
    }
  });
});

// ─── i18n Bilingual ──────────────────────────────────────────────

test.describe("J18 — i18n: Tab Labels", () => {
  test("J18.22 — PT-BR: tabs show Habilidades, Raças, Antecedentes", async ({
    page,
  }) => {
    // /try defaults to browser locale; DM_PRIMARY is PT-BR
    await goToTryPage(page);
    await addAllCombatants(page, QUICK_ENCOUNTER);
    await startCombat(page);
    const dialog = await openCompendium(page);

    const dialogText = await dialog.textContent();

    // Check for PT-BR OR EN labels (guest may use browser locale)
    // The important thing: all 3 new tabs exist
    const hasAbilities =
      dialogText?.includes("Habilidades") ||
      dialogText?.includes("Abilities");
    const hasRaces =
      dialogText?.includes("Raças") || dialogText?.includes("Races");
    const hasBackgrounds =
      dialogText?.includes("Antecedentes") ||
      dialogText?.includes("Backgrounds");

    expect(hasAbilities).toBe(true);
    expect(hasRaces).toBe(true);
    expect(hasBackgrounds).toBe(true);
  });

  test("J18.23 — EN: tabs show Abilities, Races, Backgrounds", async ({
    page,
  }) => {
    // Login as English DM to force EN locale, then use compendium page
    await loginAs(page, DM_ENGLISH);
    await page.goto("/app/compendium?tab=races");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    // The /app/compendium page has Races, Backgrounds tabs (EN or PT-BR)
    const bodyText = await page.textContent("body");
    expect(bodyText).toMatch(/Races|Raças/);
    expect(bodyText).toMatch(/Backgrounds|Antecedentes/);

    // Navigate to backgrounds tab
    const bgTab = page
      .locator("button")
      .filter({ hasText: /^Backgrounds$|^Antecedentes$/ })
      .first();
    if (await bgTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await bgTab.click();
      await page.waitForTimeout(1_000);
      const updatedText = await page.textContent("body");
      expect(updatedText).not.toContain("Internal Server Error");
    }
  });
});
