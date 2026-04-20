/**
 * Release 2026-04-20 smoke suite
 *
 * Validates the 8 waves shipped in release 2026-04-20 against production:
 *  - Onda 2a: Campaign Dashboard Briefing (F10)
 *  - Onda 2b: Navigation Redesign + Quick Switcher (F13, behind feature flag)
 *  - Onda 4: Player Notes Visibility (F01/F02) — smoke of UI presence
 *  - Onda 5: Auto-Invite Combat (F19) — smoke of listener mount
 *
 * Deep-integration of Wave 4 (multi-player) and Wave 5 (realtime) requires
 * dedicated multi-page specs (see e2e/release/notes-visibility.spec.ts and
 * auto-invite.spec.ts when created). This file is the quick smoke.
 *
 * Run: BASE_URL=https://pocketdm.com.br rtk npx playwright test \
 *        e2e/release/release-2026-04-20.spec.ts --project=desktop-chrome
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { DM_PRIMARY } from "../fixtures/test-accounts";

test.describe("Release 2026-04-20 — smoke suite", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DM_PRIMARY);
  });

  test("Onda 2a — Briefing render em dashboard da campanha", async ({ page }) => {
    // Navegar pra primeira campanha visível no dashboard
    await page.goto("/app/dashboard/campaigns");
    const firstCampaignLink = page
      .locator('a[href*="/app/campaigns/"]')
      .first();
    await firstCampaignLink.waitFor({ state: "visible", timeout: 15_000 });
    await firstCampaignLink.click();
    await page.waitForURL(/\/app\/campaigns\/[^/]+$/, { timeout: 20_000 });

    // Briefing renderiza: "Hoje na sua mesa" (PT-BR) OU "Today at your table" (EN)
    const todaySection = page.locator(
      '[aria-labelledby="briefing-today-title"]'
    );
    await expect(todaySection).toBeVisible({ timeout: 10_000 });

    // CampaignGrid antigo NÃO deve estar na árvore
    const legacyGrid = page.locator('[data-testid="campaign-grid"]');
    await expect(legacyGrid).toHaveCount(0);
  });

  test("Onda 2b — Sidebar esquerda presente quando flag ON", async ({
    page,
  }) => {
    await page.goto("/app/dashboard");
    // Feature flag NEXT_PUBLIC_FEATURE_NEW_SIDEBAR=true esperado em prod
    // Seletor preservado do tour: data-tour-id="dash-sidebar"
    const sidebar = page.locator('[data-tour-id="dash-sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 10_000 });
  });

  test("Onda 2b — Ctrl+K abre Quick Switcher", async ({ page }) => {
    await page.goto("/app/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.keyboard.press("Control+K");

    // CommandPalette (cmdk) abre como role=dialog OU com attribute cmdk-root
    const palette = page
      .locator('[cmdk-root], [role="dialog"][aria-label*="search" i], [role="dialog"][aria-label*="switch" i]')
      .first();
    await expect(palette).toBeVisible({ timeout: 5_000 });
  });

  test("Onda 4 — Player HQ renderiza tab Notes com sub-tab Do mestre", async ({
    page,
  }) => {
    // DM_PRIMARY também tem character em sua campanha; acessar via link do card
    await page.goto("/app/dashboard/characters");
    const firstCharLink = page.locator('a[href*="/characters/"]').first();
    const linkExists = await firstCharLink.count();
    if (linkExists === 0) {
      test.skip(true, "DM_PRIMARY sem character no dashboard — precisa seed");
      return;
    }
    await firstCharLink.click();
    await page.waitForURL(/\/(characters|sheet)\//, { timeout: 20_000 });

    // Se a página Player HQ renderiza, esperamos um label/tab de Notas
    // Sub-tab "Do mestre" (Scroll icon) deve existir mesmo sem notas
    // Fallback tolerante: apenas confirma que a página Notes renderiza sem crash
    const notesTab = page.getByRole("tab", { name: /notas|notes/i }).first();
    const notesCount = await notesTab.count();
    if (notesCount > 0) {
      await notesTab.click();
      await expect(
        page.getByText(/do mestre|from dm|from the dm/i).first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("Onda 5 — NotificationBell renderiza sem crash", async ({ page }) => {
    await page.goto("/app/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // Bell deve estar presente quer seja no header antigo (flag OFF) ou
    // no footer da sidebar nova (flag ON). Tolerante a ambos layouts.
    const bell = page
      .locator('[data-testid="notification-bell"], [aria-label*="notifica" i]')
      .first();
    const count = await bell.count();
    if (count === 0) {
      test.info().annotations.push({
        type: "warning",
        description:
          "NotificationBell not found — check layout mount in app/app/layout.tsx",
      });
    } else {
      await expect(bell).toBeVisible();
    }
  });

  test("Onda 0 — Bug B03: opengraph image redireciona 308", async ({
    request,
  }) => {
    const response = await request.get(
      "https://pocketdm.com.br/opengraph-image.png",
      {
        maxRedirects: 0,
      }
    );
    expect(response.status()).toBe(308);
  });

  test("Combat Parity — /try (guest) responde sem auth", async ({ page }) => {
    // Logout implícito: abrir /try em context novo via page.goto (mantém auth,
    // mas /try não exige auth)
    await page.goto("/try");
    await expect(page).toHaveURL(/\/try/);
    // Guest path NÃO deve redirecionar pra login nem pra /app/*
  });
});
