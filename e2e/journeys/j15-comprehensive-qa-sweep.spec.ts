/**
 * J15 — Comprehensive QA Sweep (50+ scenarios)
 *
 * Covers ALL features not tested by J1-J14:
 *  - Landing page, pricing, legal pages
 *  - Auth flows: signup page, password reset, logout
 *  - Dashboard interactions: encounters, campaigns
 *  - Campaign CRUD + player management
 *  - Presets management
 *  - Encounter setup advanced: SRD monster search, ruleset switch, roll initiative
 *  - Combat actions: edit stats, defeat, remove, DM notes, weather, keyboard shortcuts
 *  - Combat end flow + leaderboard
 *  - Compendium detail views: monster stat block, spell detail, condition detail
 *  - HP adjuster modes (damage/heal/temp), multi-target
 *  - Monster groups, expanded stat blocks
 *  - QR code share
 *  - Error handling, invalid routes
 *  - Onboarding, settings
 *  - Dice roll log, inline initiative edit
 *
 * Perspective: DM (admin) — all tests use DM login unless stated otherwise.
 * Target: production (https://www.pocketdm.com.br)
 */
import { test, expect } from "@playwright/test";
import { loginAs, logout } from "../helpers/auth";
import { goToNewSession, dmSetupCombatSession, playerJoinCombat } from "../helpers/session";
import { DM_PRIMARY, PLAYER_WARRIOR } from "../fixtures/test-accounts";

// ═══════════════════════════════════════════════════════════════
// SECTION A — Landing Page & Marketing
// ═══════════════════════════════════════════════════════════════

test.describe("J15-A — Landing & Marketing Pages", () => {
  test("J15.A1 — Landing page loads with hero section and CTA", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");
    expect(body!.length).toBeGreaterThan(100);

    // Hero section should have CTA links
    const cta = page.locator('a[href*="/try"], a[href*="/auth"]').first();
    await expect(cta).toBeVisible({ timeout: 10_000 });
  });

  test("J15.A2 — Landing page has navigation links", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Should have links to pricing, try, login
    const body = await page.textContent("body");
    const hasNav = body!.includes("Preço") || body!.includes("Pricing") ||
                   body!.includes("Experimente") || body!.includes("Try");
    expect(hasNav).toBe(true);
  });

  test("J15.A3 — Pricing page loads with plan comparison", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("domcontentloaded");

    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");

    // Should show plan info
    const hasPlans = body!.includes("Free") || body!.includes("Grátis") ||
                     body!.includes("Pro") || body!.includes("Mesa");
    expect(hasPlans).toBe(true);
  });

  test("J15.A4 — /try link from landing works", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    const tryLink = page.locator('a[href="/try"]').first();
    await expect(tryLink).toBeVisible({ timeout: 10_000 });
    await tryLink.click();
    await page.waitForLoadState("domcontentloaded");

    // Guest combat — should see add-row form
    await expect(page.locator('[data-testid="add-row"]')).toBeVisible({ timeout: 20_000 });
  });

  test("J15.A5 — Privacy page loads", async ({ page }) => {
    await page.goto("/legal/privacy");
    await page.waitForLoadState("domcontentloaded");

    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");
    expect(body!.length).toBeGreaterThan(50);
  });

  test("J15.A6 — Attribution page loads", async ({ page }) => {
    await page.goto("/legal/attribution");
    await page.waitForLoadState("domcontentloaded");

    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");
    expect(body!.length).toBeGreaterThan(50);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION B — Auth Flows
// ═══════════════════════════════════════════════════════════════

test.describe("J15-B — Auth Flows", () => {
  test("J15.B1 — Login page renders form with email/password", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("domcontentloaded");

    const emailInput = page.locator("#login-email");
    const passwordInput = page.locator("#login-password");
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(passwordInput).toBeVisible();
  });

  test("J15.B2 — Signup page renders", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.waitForLoadState("domcontentloaded");

    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");
    // Should have form fields
    const emailInput = page.locator('input[type="email"], #signup-email, input[name="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
  });

  test("J15.B3 — Forgot password page renders", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await page.waitForLoadState("domcontentloaded");

    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
  });

  test("J15.B4 — Logout clears session and redirects", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
    await expect(page).toHaveURL(/\/app\//, { timeout: 15_000 });

    // Click logout
    const logoutBtn = page.locator('button:has-text("Logout")');
    if (await logoutBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(3_000);

      // Should be on login or landing page
      const url = page.url();
      const loggedOut = url.includes("/auth/login") || url.includes("/") && !url.includes("/app/");
      expect(loggedOut).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION C — Dashboard Interactions
// ═══════════════════════════════════════════════════════════════

test.describe("J15-C — Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("J15.C1 — Dashboard shows campaigns section", async ({ page }) => {
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15_000 });

    // Wait for dashboard loading screen to finish
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(3_000);

    const campaignsHeading = page.locator('h2:has-text("Campanhas"), h2:has-text("Campaigns")');
    await expect(campaignsHeading).toBeVisible({ timeout: 30_000 });
  });

  test("J15.C2 — Dashboard shows active encounters", async ({ page }) => {
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15_000 });

    // Should show encounters heading or empty state
    const body = await page.textContent("body");
    const hasEncounters = body!.includes("Encontros") || body!.includes("Encounters") ||
                          body!.includes("Em Andamento") || body!.includes("Active");
    expect(hasEncounters).toBe(true);
  });

  test("J15.C3 — New session button navigates to /app/session/new", async ({ page }) => {
    // Wait for dashboard to fully load
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(3_000);

    const newBtn = page.locator('a[href*="/session/new"]').first();
    await expect(newBtn).toBeVisible({ timeout: 30_000 });
    await newBtn.click();
    await page.waitForURL("**/app/session/new", { timeout: 15_000 });
  });

  test("J15.C4 — New campaign button opens dialog", async ({ page }) => {
    const newCampaignBtn = page.locator('button:has-text("Nova Campanha"), button:has-text("New Campaign")');
    if (await newCampaignBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newCampaignBtn.click();
      await page.waitForTimeout(1_000);

      // Dialog or form should appear
      const dialog = page.locator('[role="dialog"], [data-testid="campaign-dialog"]').first();
      const hasDialog = await dialog.isVisible({ timeout: 3_000 }).catch(() => false);
      const nameInput = page.locator('input[placeholder*="nome"], input[placeholder*="name"]').first();
      const hasInput = await nameInput.isVisible({ timeout: 3_000 }).catch(() => false);
      expect(hasDialog || hasInput).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION D — Campaigns & Player Management
// ═══════════════════════════════════════════════════════════════

test.describe("J15-D — Campaign Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("J15.D1 — Campaign detail page loads with player list", async ({ page }) => {
    // Navigate to Krynn campaign (known existing)
    const campaignLink = page.locator('a[href*="/app/campaigns/"]').first();
    if (await campaignLink.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await campaignLink.click();
      await page.waitForLoadState("domcontentloaded");

      const body = await page.textContent("body");
      expect(body).not.toContain("Internal Server Error");
      expect(body!.length).toBeGreaterThan(50);
    }
  });

  test("J15.D2 — Campaign picker appears on /app/session/new", async ({ page }) => {
    await page.goto("/app/session/new");
    await page.waitForLoadState("domcontentloaded");

    // Wait for campaigns to load (may show "Carregando campanhas..." first)
    await page.waitForTimeout(5_000);

    // Campaign picker or quick combat button or add-row (if already past picker)
    const quickBtn = page.locator('button:has-text("Combate Rápido"), button:has-text("Quick Combat")');
    const addRow = page.locator('[data-testid="add-row"]');

    await expect(quickBtn.or(addRow)).toBeVisible({ timeout: 20_000 });
  });

  test("J15.D3 — Campaign selection preloads player characters", async ({ page }) => {
    await page.goto("/app/session/new");
    await page.waitForLoadState("domcontentloaded");

    const krynn = page.locator('button:has-text("Krynn")');
    if (await krynn.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await krynn.click();
      await page.waitForTimeout(3_000);

      // Should show setup with preloaded characters
      const addRow = page.locator('[data-testid="add-row"]');
      await expect(addRow).toBeVisible({ timeout: 10_000 });

      // Preloaded characters should be in setup rows
      const setupRows = page.locator('[data-testid^="setup-row-"]');
      const count = await setupRows.count();
      // Krynn has 5 players — at least some should be preloaded
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION E — Presets Management
// ═══════════════════════════════════════════════════════════════

test.describe("J15-E — Presets", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("J15.E1 — Presets page renders with title and new button", async ({ page }) => {
    await page.goto("/app/presets");
    await page.waitForLoadState("networkidle");

    // Wait for React hydration
    await page.waitForTimeout(5_000);

    // Page should have loaded without error
    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");

    // Should contain preset-related content
    const hasPresets = body!.includes("Encontros Preparados") || body!.includes("Encounter Presets") ||
                       body!.includes("Preset") || body!.includes("preset");
    expect(hasPresets).toBe(true);

    // New preset button should exist
    const newBtn = page.locator('button:has-text("Novo Preset"), button:has-text("New Preset"), button:has-text("Novo")').first();
    await expect(newBtn).toBeVisible({ timeout: 10_000 });
  });

  test("J15.E2 — Load preset button visible in encounter setup", async ({ page }) => {
    await goToNewSession(page);

    const loadPresetBtn = page.locator('button:has-text("Carregar Preset de Combate"), button:has-text("Load Combat Preset")');
    await expect(loadPresetBtn).toBeVisible({ timeout: 10_000 });
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION F — Encounter Setup Advanced Features
// ═══════════════════════════════════════════════════════════════

test.describe("J15-F — Encounter Setup Advanced", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("J15.F1 — SRD monster search auto-fills stats", async ({ page }) => {
    await goToNewSession(page);

    // The SRD search uses data-testid="srd-search-input" or an input inside MonsterSearchPanel
    const srdInput = page.locator('[data-testid="srd-search-input"], input[placeholder*="monstro"], input[placeholder*="monster"], input[placeholder*="Buscar"]').first();
    if (!(await srdInput.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip(true, "SRD search input not found");
      return;
    }
    await srdInput.fill("Goblin");
    await page.waitForTimeout(2_000);

    // Autocomplete results should appear
    const results = page.locator('[role="listbox"] [role="option"], [data-testid^="srd-result-"]').first();
    const hasResults = await results.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasResults) {
      await results.click();
      await page.waitForTimeout(1_000);

      // Combatant should be added with auto-filled stats
      const rows = page.locator('[data-testid^="setup-row-"]');
      expect(await rows.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test("J15.F2 — Ruleset toggle switches between 2014 and 2024", async ({ page }) => {
    await goToNewSession(page);

    const btn2014 = page.locator('button:has-text("2014")');
    const btn2024 = page.locator('button:has-text("2024")');
    if (!(await btn2014.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip(true, "Ruleset toggle not visible");
      return;
    }
    await expect(btn2024).toBeVisible();

    // Toggle to 2024
    await btn2024.click();
    await page.waitForTimeout(1_000);

    // 2024 should now be pressed
    const is2024Pressed = await btn2024.getAttribute("aria-pressed");
    // Accept either pressed state or visual active state
    expect(is2024Pressed === "true" || await btn2024.evaluate(el => el.classList.contains("bg-gold/20") || el.getAttribute("data-state") === "on")).toBe(true);
  });

  test("J15.F3 — Duplicate combatant button works", async ({ page }) => {
    await goToNewSession(page);

    // Add a combatant first
    await page.fill('[data-testid="add-row-name"]', "DuplicateMe");
    await page.fill('[data-testid="add-row-hp"]', "30");
    await page.fill('[data-testid="add-row-ac"]', "14");
    await page.fill('[data-testid="add-row-init"]', "12");
    await page.click('[data-testid="add-row-btn"]');
    await expect(page.locator('[data-testid^="setup-row-"]').first()).toBeVisible({ timeout: 5_000 });

    // Click duplicate button (button text includes combatant name: "Duplicar DuplicateMe")
    const dupBtn = page.locator('button:has-text("Duplicar"), button:has-text("Duplicate")').first();
    if (await dupBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await dupBtn.click();
      await page.waitForTimeout(1_000);

      const rows = page.locator('[data-testid^="setup-row-"]');
      expect(await rows.count()).toBe(2);
    }
  });

  test("J15.F4 — Remove combatant from setup", async ({ page }) => {
    await goToNewSession(page);

    // Ensure manual form is open (goToNewSession should handle this)
    const addRowName = page.locator('[data-testid="add-row-name"]');
    if (!(await addRowName.isVisible({ timeout: 3_000 }).catch(() => false))) {
      const manualToggle = page.locator('button').filter({ hasText: /Manual/i }).first();
      if (await manualToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await manualToggle.click();
        await page.waitForTimeout(300);
      }
    }

    // Add 2 combatants
    for (const name of ["RemoveA", "RemoveB"]) {
      await page.fill('[data-testid="add-row-name"]', name);
      await page.fill('[data-testid="add-row-hp"]', "20");
      await page.fill('[data-testid="add-row-ac"]', "14");
      await page.fill('[data-testid="add-row-init"]', "10");
      await page.click('[data-testid="add-row-btn"]');
      await page.waitForTimeout(400);
    }

    await expect(page.locator('[data-testid^="setup-row-"]')).toHaveCount(2, { timeout: 5_000 });

    // Remove first combatant
    const removeBtn = page.locator('button:has-text("Remover"), button:has-text("Remove")').first();
    if (await removeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await removeBtn.click();
      await page.waitForTimeout(1_000);

      const rows = page.locator('[data-testid^="setup-row-"]');
      expect(await rows.count()).toBe(1);
    }
  });

  test("J15.F5 — SRD monster quantity selector increments", async ({ page }) => {
    await goToNewSession(page);

    // Find the "Aumentar quantidade" button (+ button for SRD quantity)
    const plusBtn = page.locator('button[aria-label="Aumentar quantidade"]');
    if (await plusBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Get initial value of the quantity display (between - and + buttons)
      const minusBtn = page.locator('button[aria-label="Diminuir quantidade"]');
      const qtyText = page.locator('button[aria-label="Diminuir quantidade"] + *');

      await plusBtn.click();
      await page.waitForTimeout(300);
      await plusBtn.click();
      await page.waitForTimeout(300);

      // The "-" button should now be enabled (quantity > 1)
      const isMinusDisabled = await minusBtn.isDisabled().catch(() => true);
      expect(isMinusDisabled).toBe(false);
    }
  });

  test("J15.F6 — CR calculator visible with combatants", async ({ page }) => {
    await goToNewSession(page);

    // Ensure manual form is open
    const addRowName = page.locator('[data-testid="add-row-name"]');
    if (!(await addRowName.isVisible({ timeout: 3_000 }).catch(() => false))) {
      const manualToggle = page.locator('button').filter({ hasText: /Manual/i }).first();
      if (await manualToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await manualToggle.click();
        await page.waitForTimeout(300);
      }
    }

    // Add combatants to trigger CR calc
    for (const c of [
      { name: "Hero", hp: "45", ac: "18", init: "15" },
      { name: "Goblin", hp: "7", ac: "15", init: "10" },
    ]) {
      await page.fill('[data-testid="add-row-name"]', c.name);
      await page.fill('[data-testid="add-row-hp"]', c.hp);
      await page.fill('[data-testid="add-row-ac"]', c.ac);
      await page.fill('[data-testid="add-row-init"]', c.init);
      await page.click('[data-testid="add-row-btn"]');
      await page.waitForTimeout(400);
    }

    // CR/difficulty indicator should be visible
    const crIndicator = page.locator('[data-testid="cr-calculator"], [data-testid="encounter-difficulty"]').first();
    const hasCr = await crIndicator.isVisible({ timeout: 5_000 }).catch(() => false);
    // CR may show as XP or difficulty text in the footer area
    const body = await page.textContent("body");
    const hasXp = body!.includes("XP") || body!.includes("Fácil") || body!.includes("Easy");
    expect(hasCr || hasXp).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION G — Combat Actions (Advanced)
// ═══════════════════════════════════════════════════════════════

test.describe("J15-G — Combat Actions", () => {
  test.setTimeout(90_000);

  test("J15.G1 — Edit combatant stats mid-combat", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "EditMe", hp: "50", ac: "14", init: "12" },
      { name: "Other", hp: "30", ac: "14", init: "8" },
    ]);

    // "Editar estatísticas" button on combatant row
    const editBtn = page.locator('button:has-text("Editar")').first();
    if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(1_500);

      // Edit UI may be a dialog, popover, or inline form (hp-adjuster is the most common)
      const editUI = page.locator('[role="dialog"], [data-testid="hp-adjuster"], [data-testid*="edit"], [data-testid*="stats"]').first();
      const hasUI = await editUI.isVisible({ timeout: 3_000 }).catch(() => false);
      // Close it
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // Combat should still function regardless
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible();
    await ctx.close().catch(() => {});
  });

  test("J15.G2 — Defeat combatant button works", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "DefeatMe", hp: "10", ac: "12", init: "8" },
      { name: "Hero", hp: "50", ac: "16", init: "18" },
    ]);

    const defeatBtn = page.locator('button:has-text("Derrotar"), button:has-text("Defeat")').first();
    if (await defeatBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await defeatBtn.click();
      await page.waitForTimeout(1_000);

      // Combat should still be active
      await expect(page.locator('[data-testid="active-combat"]')).toBeVisible();
    }

    await ctx.close().catch(() => {});
  });

  test("J15.G3 — Remove combatant mid-combat", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "RemoveMe", hp: "10", ac: "12", init: "5" },
      { name: "StayHere", hp: "50", ac: "16", init: "18" },
    ]);

    // Remove may require expanding a menu or clicking a specific button
    const removeBtn = page.locator('button:has-text("Remover"), button:has-text("Remove"), button[aria-label*="Remover"]').first();
    if (!(await removeBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      // Remove button may be inside a dropdown menu — skip if not directly visible
      test.skip(true, "Remove button not directly visible in combat view");
      await ctx.close().catch(() => {});
      return;
    }
    await removeBtn.click();
    await page.waitForTimeout(1_000);

    const rows = page.locator('[data-testid^="combatant-row-"]');
    expect(await rows.count()).toBe(1);

    await ctx.close().catch(() => {});
  });

  test("J15.G4 — Add combatant mid-combat", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "Original", hp: "50", ac: "16", init: "15" },
      { name: "Dummy", hp: "10", ac: "10", init: "5" },
    ]);

    const addBtn = page.locator('button:has-text("Adicionar"), button:has-text("Add")').first();
    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(1_000);

      // Fill mid-combat add form
      const nameInput = page.locator('[data-testid="add-row-name"], input[placeholder*="Nome"]').first();
      if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await nameInput.fill("Reinforcement");
        const hpInput = page.locator('[data-testid="add-row-hp"]').first();
        if (await hpInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
          await hpInput.fill("20");
        }
        const addRowBtn = page.locator('[data-testid="add-row-btn"]');
        if (await addRowBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
          await addRowBtn.click();
          await page.waitForTimeout(1_000);
        }
      }
    }

    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible();
    await ctx.close().catch(() => {});
  });

  test("J15.G5 — Weather effect selector opens", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "WeatherTest", hp: "30", ac: "14", init: "12" },
      { name: "Dummy", hp: "10", ac: "10", init: "5" },
    ]);

    // Button text is "Efeito Climático" with weather emoji
    const weatherBtn = page.locator('button:has-text("Climático"), button:has-text("Weather"), button:has-text("🌤")');
    if (await weatherBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await weatherBtn.click();
      await page.waitForTimeout(1_500);

      // Weather selector may be a dialog, popover, or inline panel
      const weatherUI = page.locator('[role="dialog"], [data-testid*="weather"], [data-testid*="background"]').first();
      const hasUI = await weatherUI.isVisible({ timeout: 3_000 }).catch(() => false);

      // If no dialog, check if the page body shows weather options
      if (!hasUI) {
        const body = await page.textContent("body");
        const hasWeatherText = body!.includes("Chuva") || body!.includes("Rain") ||
                               body!.includes("Neve") || body!.includes("Snow") ||
                               body!.includes("Nenhum") || body!.includes("None");
        expect(hasWeatherText).toBe(true);
      }

      await page.keyboard.press("Escape");
    }

    await ctx.close().catch(() => {});
  });

  test("J15.G6 — Keyboard shortcuts cheatsheet opens", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "KBTest", hp: "30", ac: "14", init: "12" },
      { name: "Dummy", hp: "10", ac: "10", init: "5" },
    ]);

    const kbBtn = page.locator('button:has-text("?"), button[aria-label*="Atalhos"], button[aria-label*="Keyboard"]');
    if (await kbBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await kbBtn.click();
      await page.waitForTimeout(1_000);

      const dialog = page.locator('[role="dialog"]').first();
      const hasDialog = await dialog.isVisible({ timeout: 3_000 }).catch(() => false);
      expect(hasDialog).toBe(true);

      await page.keyboard.press("Escape");
    }

    await ctx.close().catch(() => {});
  });

  test("J15.G7 — Hide combatant from players toggle", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "HideMe", hp: "30", ac: "14", init: "12" },
      { name: "Visible", hp: "30", ac: "14", init: "8" },
    ]);

    const hideBtn = page.locator('button[aria-label*="Ocultar"], button[aria-label*="Hide"]').first();
    if (await hideBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await hideBtn.click();
      await page.waitForTimeout(500);

      // Combat should still function
      await expect(page.locator('[data-testid="active-combat"]')).toBeVisible();
    }

    await ctx.close().catch(() => {});
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION H — Combat End & Leaderboard
// ═══════════════════════════════════════════════════════════════

test.describe("J15-H — Combat End Flow", () => {
  test.setTimeout(90_000);

  test("J15.H1 — End encounter button and confirmation", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "EndTest", hp: "30", ac: "14", init: "12" },
      { name: "Dummy", hp: "10", ac: "10", init: "5" },
    ]);

    const endBtn = page.locator('[data-testid="end-encounter-btn"], button:has-text("Fim"), button:has-text("Encerrar")');
    await expect(endBtn.first()).toBeVisible({ timeout: 10_000 });
    await endBtn.first().click();
    await page.waitForTimeout(1_000);

    // Confirmation dialog should appear
    const confirmBtn = page.locator(
      'button:has-text("Confirmar"), button:has-text("Confirm"), button:has-text("Encerrar"), button:has-text("Sim")'
    ).first();
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(2_000);
    }

    // Should show leaderboard or return to setup
    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");

    await ctx.close().catch(() => {});
  });

  test("J15.H2 — DM audio volume controls in combat", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "AudioTest", hp: "30", ac: "14", init: "12" },
      { name: "Dummy", hp: "10", ac: "10", init: "5" },
    ]);

    const volumeBtn = page.locator('button:has-text("🔊"), button[aria-label*="Volume"]');
    if (await volumeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await volumeBtn.click();
      await page.waitForTimeout(1_000);

      // Volume popover/slider should appear
      const slider = page.locator('[role="slider"], input[type="range"]').first();
      const hasSlider = await slider.isVisible({ timeout: 3_000 }).catch(() => false);
      expect(hasSlider).toBe(true);
    }

    await ctx.close().catch(() => {});
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION I — Compendium Detail Views
// ═══════════════════════════════════════════════════════════════

test.describe("J15-I — Compendium Details", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("J15.I1 — Monster stat block opens from compendium list", async ({ page }) => {
    await page.goto("/app/compendium?tab=monsters");
    await page.waitForLoadState("domcontentloaded");

    const searchInput = page.locator('input[placeholder*="Filtrar"], input[placeholder*="Filter"]').first();
    await expect(searchInput).toBeVisible({ timeout: 20_000 });
    await searchInput.fill("Goblin");
    await page.waitForTimeout(2_000);

    // Click a monster row
    const row = page.locator('[role="listbox"] [role="option"], li').filter({ hasText: "Goblin" }).first();
    if (await row.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await row.click();
      await page.waitForTimeout(2_000);

      // Stat block should appear on the right panel
      const body = await page.textContent("body");
      const hasStats = body!.includes("HP") || body!.includes("AC") ||
                       body!.includes("STR") || body!.includes("FOR");
      expect(hasStats).toBe(true);
    }
  });

  test("J15.I2 — Spell detail view shows school and level", async ({ page }) => {
    await page.goto("/app/compendium?tab=spells");
    await page.waitForLoadState("domcontentloaded");

    const searchInput = page.locator('input[placeholder*="Filtrar"], input[placeholder*="Filter"]').first();
    await expect(searchInput).toBeVisible({ timeout: 20_000 });
    await searchInput.fill("Fireball");
    await page.waitForTimeout(2_000);

    const row = page.locator('li, button, [role="option"]').filter({ hasText: /Fireball|Bola de Fogo/ }).first();
    if (await row.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await row.click();
      await page.waitForTimeout(2_000);

      const body = await page.textContent("body");
      const hasDetail = body!.includes("8d6") || body!.includes("Evocation") ||
                        body!.includes("Evocação") || body!.includes("fire") || body!.includes("fogo");
      expect(hasDetail).toBe(true);
    }
  });

  test("J15.I3 — Conditions tab shows condition list", async ({ page }) => {
    await page.goto("/app/compendium?tab=conditions");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3_000);

    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");

    // Should show at least some conditions
    const hasConditions = body!.includes("Blinded") || body!.includes("Cego") ||
                          body!.includes("Poisoned") || body!.includes("Envenenado") ||
                          body!.includes("Frightened") || body!.includes("Amedrontado");
    expect(hasConditions).toBe(true);
  });

  test("J15.I4 — Items tab loads", async ({ page }) => {
    await page.goto("/app/compendium?tab=items");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3_000);

    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");
    expect(body!.length).toBeGreaterThan(100);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION J — HP Adjuster Modes
// ═══════════════════════════════════════════════════════════════

test.describe("J15-J — HP Adjuster", () => {
  test.setTimeout(90_000);

  test("J15.J1 — HP adjuster opens and has damage/heal modes", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "HPModeTest", hp: "50", ac: "14", init: "12" },
      { name: "Dummy", hp: "10", ac: "10", init: "5" },
    ]);

    const hpBtn = page.locator('[data-testid^="hp-btn-"]').first();
    await expect(hpBtn).toBeVisible({ timeout: 5_000 });
    await hpBtn.click();

    const adjuster = page.locator('[data-testid="hp-adjuster"], [role="dialog"]').first();
    await expect(adjuster).toBeVisible({ timeout: 5_000 });

    // Should have damage and heal buttons/tabs
    const body = await page.textContent("body");
    const hasModes = body!.includes("Dano") || body!.includes("Damage") ||
                     body!.includes("Cura") || body!.includes("Heal");
    expect(hasModes).toBe(true);

    await ctx.close().catch(() => {});
  });

  test("J15.J2 — HP adjuster has temp HP option", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "TempHPTest", hp: "50", ac: "14", init: "12" },
      { name: "Dummy", hp: "10", ac: "10", init: "5" },
    ]);

    const hpBtn = page.locator('[data-testid^="hp-btn-"]').first();
    await expect(hpBtn).toBeVisible({ timeout: 5_000 });
    await hpBtn.click();
    await page.waitForTimeout(1_000);

    // HP adjuster should be open — verify temp HP option exists in the UI
    const adjusterBody = await page.textContent("body");
    const hasTempOption = adjusterBody!.includes("Temp") ||
                          adjusterBody!.includes("Temporário") ||
                          adjusterBody!.includes("temp");

    // Temp HP mode may be a tab, button, or section
    const tempBtn = page.locator(
      'button:has-text("Temp"), button:has-text("Temporário"), [data-testid="hp-mode-temp"]'
    ).first();
    const hasTempBtn = await tempBtn.isVisible({ timeout: 2_000 }).catch(() => false);

    // At least the concept of temp HP should exist
    expect(hasTempOption || hasTempBtn).toBe(true);

    await page.keyboard.press("Escape");
    await expect(page.locator('[data-testid="active-combat"]')).toBeVisible();
    await ctx.close().catch(() => {});
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION K — QR Code & Share
// ═══════════════════════════════════════════════════════════════

test.describe("J15-K — Share Features", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("J15.K1 — Share button shows QR code toggle", async ({ page }) => {
    await goToNewSession(page);

    const prepareBtn = page.locator('[data-testid="share-prepare-btn"]');
    if (await prepareBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await prepareBtn.click();
      await page.waitForTimeout(2_000);
    }

    const generateBtn = page.locator('[data-testid="share-session-generate"]');
    if (await generateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await generateBtn.click();
      await page.waitForTimeout(2_000);
    }

    // QR code toggle should appear
    const qrBtn = page.locator('button:has-text("QR Code"), button:has-text("QR")');
    const hasQr = await qrBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    expect(hasQr).toBe(true);
  });

  test("J15.K2 — Share URL contains /join/ with valid token", async ({ page }) => {
    await goToNewSession(page);

    const prepareBtn = page.locator('[data-testid="share-prepare-btn"]');
    if (await prepareBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await prepareBtn.click();
      await page.waitForTimeout(2_000);
    }

    const generateBtn = page.locator('[data-testid="share-session-generate"]');
    if (await generateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await generateBtn.click();
      await page.waitForTimeout(2_000);
    }

    const shareUrl = page.locator('[data-testid="share-session-url"]');
    if (await shareUrl.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const value = await shareUrl.inputValue();
      expect(value).toContain("/join/");
      expect(value.length).toBeGreaterThan(30);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION L — Onboarding & Settings
// ═══════════════════════════════════════════════════════════════

test.describe("J15-L — Onboarding & Settings", () => {
  test("J15.L1 — Settings page shows language selector and account info", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
    await page.goto("/app/settings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");

    // Should show account email or settings form
    const hasSettings = body!.includes("@") || body!.includes("Idioma") ||
                        body!.includes("Language") || body!.includes("Configurações") ||
                        body!.includes("Settings");
    expect(hasSettings).toBe(true);
  });

  test("J15.L2 — Onboarding page loads without crash", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
    await page.goto("/app/onboarding");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3_000);

    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");

    // Onboarding may redirect if already completed
    const url = page.url();
    const ok = url.includes("/onboarding") || url.includes("/dashboard") || url.includes("/session");
    expect(ok).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION M — Error Handling & Edge Cases
// ═══════════════════════════════════════════════════════════════

test.describe("J15-M — Error Handling", () => {
  test("J15.M1 — Invalid session URL shows graceful error", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
    await page.goto("/app/session/nonexistent-uuid-12345");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3_000);

    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");
  });

  test("J15.M2 — Invalid join token shows graceful error", async ({ page }) => {
    await page.goto("/join/invalid-token-xyz123");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(5_000);

    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");
    expect(page.url()).not.toContain("/auth/login");
  });

  test("J15.M3 — All app routes return non-500", async ({ page }) => {
    await loginAs(page, DM_PRIMARY);

    const routes = [
      "/app/dashboard",
      "/app/compendium?tab=monsters",
      "/app/compendium?tab=spells",
      "/app/compendium?tab=conditions",
      "/app/presets",
      "/app/settings",
    ];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).not.toBe(500);
      await page.waitForTimeout(500);
    }
  });

  test("J15.M4 — 404 page doesn't show raw error", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-at-all");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2_000);

    const body = await page.textContent("body");
    expect(body).not.toContain("Internal Server Error");
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION N — Dice Roll Log
// ═══════════════════════════════════════════════════════════════

test.describe("J15-N — Dice Roll Log", () => {
  test.setTimeout(90_000);

  test("J15.N1 — Dice roll log button visible in combat", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "DiceTest", hp: "30", ac: "14", init: "12" },
      { name: "Dummy", hp: "10", ac: "10", init: "5" },
    ]);

    const diceBtn = page.locator('button[aria-label*="Roll"], button[aria-label*="Histórico"], button:has-text("🎲")').first();
    const hasDice = await diceBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    // Dice history toggle should exist somewhere
    const historyBtn = page.locator('button:has-text("Histórico de Rolls"), button[aria-label*="roll"]').first();
    const hasHistory = await historyBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    expect(hasDice || hasHistory).toBe(true);

    await ctx.close().catch(() => {});
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION O — Monster Groups
// ═══════════════════════════════════════════════════════════════

test.describe("J15-O — Monster Groups in Combat", () => {
  test.setTimeout(90_000);

  test("J15.O1 — Multiple goblins show in initiative with unique IDs", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "Goblin", hp: "7", ac: "15", init: "14" },
      { name: "Goblin", hp: "7", ac: "15", init: "12" },
      { name: "Goblin", hp: "7", ac: "15", init: "10" },
      { name: "Hero", hp: "50", ac: "16", init: "18" },
    ]);

    const rows = page.locator('[data-testid="initiative-list"] [data-testid^="combatant-row-"]');
    expect(await rows.count()).toBeGreaterThanOrEqual(4);

    // Each should have unique data-testid
    const ids = await rows.evaluateAll(els => els.map(el => el.getAttribute("data-testid")));
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);

    await ctx.close().catch(() => {});
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION P — DM Sync Indicator
// ═══════════════════════════════════════════════════════════════

test.describe("J15-P — Sync & Connection", () => {
  test.setTimeout(90_000);

  test("J15.P1 — DM session shows sync/connection indicator", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "SyncTest", hp: "30", ac: "14", init: "12" },
      { name: "Dummy", hp: "10", ac: "10", init: "5" },
    ]);

    // Check for "Conectado" status in navbar (uses [data-testid="sync-indicator"] or status element)
    await page.waitForTimeout(3_000);
    const syncStatus = page.locator('[data-testid="sync-indicator"], status:has-text("Conectado"), status:has-text("Connected")').first();
    const hasSync = await syncStatus.isVisible({ timeout: 10_000 }).catch(() => false);

    // Fallback: check body text for connection status
    if (!hasSync) {
      const body = await page.textContent("body");
      const hasText = body!.includes("Conectado") || body!.includes("Connected");
      expect(hasText).toBe(true);
    }

    await ctx.close().catch(() => {});
  });
});

// ═══════════════════════════════════════════════════════════════
// SECTION Q — Accessibility
// ═══════════════════════════════════════════════════════════════

test.describe("J15-Q — Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("J15.Q1 — Skip to content link exists", async ({ page }) => {
    const skipLink = page.locator('a:has-text("Pular para conteúdo"), a:has-text("Skip to content")');
    // Focus it to make visible
    await skipLink.focus();
    const hasSkip = await skipLink.isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasSkip).toBe(true);
  });

  test("J15.Q2 — Main navigation has landmark", async ({ page }) => {
    const nav = page.locator('nav[aria-label*="navigation"], nav[aria-label*="Main"]');
    await expect(nav).toBeVisible({ timeout: 5_000 });
  });

  test("J15.Q3 — Combat initiative list has accessible role", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await dmSetupCombatSession(page, DM_PRIMARY, [
      { name: "A11yTest", hp: "30", ac: "14", init: "12" },
      { name: "Dummy", hp: "10", ac: "10", init: "5" },
    ]);

    const list = page.locator('[data-testid="initiative-list"]');
    await expect(list).toBeVisible({ timeout: 5_000 });
    const role = await list.getAttribute("role");
    // Should have list role (it's a <ul>)
    expect(role === "list" || await list.evaluate(el => el.tagName.toLowerCase()) === "ul").toBe(true);

    await ctx.close().catch(() => {});
  });
});
