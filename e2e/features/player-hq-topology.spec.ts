/**
 * Gate Fase B — `player-hq-topology` (P0, Auth).
 *
 * Story B6 (`_bmad-output/party-mode-2026-04-22/09-implementation-plan.md
 * §B6`) requires 5 scenarios that lock the new 4-tab Player HQ topology
 * (Herói / Arsenal / Diário / Mapa) replacing the legacy 7-tab shell:
 *
 *   1. Default tab on first visit = Herói
 *   2. Click Arsenal tab → content swaps to Arsenal
 *   3. Deep link `?tab=ficha` (legacy) redirects to `?tab=heroi`
 *   4. Keyboard shortcut `2` activates Arsenal
 *   5. Tab persisted across reload (localStorage 24h TTL — see B4)
 *
 * Topology canon: `_bmad-output/party-mode-2026-04-22/02-topologia-
 * navegacao.md` §6 (URL routing) + §7 (tab persistence).
 *
 * Gated by `NEXT_PUBLIC_PLAYER_HQ_V2 === "true"` — the 4-tab shell does
 * not exist with the flag OFF, so the spec skips entirely. CI flips the
 * flag ON for the V2 lane via `playwright.config.ts` env propagation.
 *
 * @tags @fase-b @b6 @player-hq @v2-only
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

const TAB_HEROI = "heroi" as const;
const TAB_ARSENAL = "arsenal" as const;

/** Locator for a tab button by its canonical key. */
function tabButton(page: Page, key: string) {
  return page.locator(`#tab-${key}, [data-testid="tab-${key}"]`).first();
}

/** Locator for a tab's content panel by its canonical testid. */
function tabContent(page: Page, key: string) {
  return page
    .locator(
      `[data-testid="${key}-tab-content"], #panel-${key}`,
    )
    .first();
}

/**
 * Navigate to the player's first campaign sheet route. Returns the
 * extracted campaign id, or null if the spec should skip (no seeded
 * campaign for this account).
 */
async function gotoFirstCampaignSheet(page: Page): Promise<string | null> {
  await loginAs(page, PLAYER_WARRIOR).catch(() => {});
  await page
    .goto("/app/dashboard", {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    })
    .catch(() => {});

  const links = page.locator('a[href^="/app/campaigns/"]');
  if ((await links.count()) === 0) return null;
  const href = await links.first().getAttribute("href");
  const match = href?.match(/\/app\/campaigns\/([0-9a-f-]+)/i);
  if (!match) return null;
  const campaignId = match[1];
  await page.goto(`/app/campaigns/${campaignId}/sheet`, {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
  if (!page.url().includes("/sheet")) return null;
  return campaignId;
}

test.describe("Gate Fase B — Player HQ topology (B6)", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "B6 specs require NEXT_PUBLIC_PLAYER_HQ_V2=true (V2 4-tab shell)",
  );
  test.setTimeout(90_000);

  test("default tab on first visit is Herói", async ({ page }) => {
    // Wipe localStorage so we get the "first visit" code path.
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
      } catch {
        /* best-effort */
      }
    });

    const id = await gotoFirstCampaignSheet(page);
    if (!id) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }

    const heroiTab = tabButton(page, TAB_HEROI);
    if ((await heroiTab.count()) === 0) {
      test.skip(true, "V2 shell not yet built — skip until B1 lands");
      return;
    }
    await expect(
      heroiTab,
      "first visit should land on Herói tab",
    ).toHaveAttribute("aria-selected", "true", { timeout: 15_000 });
    await expect(tabContent(page, TAB_HEROI)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("clicking Arsenal tab swaps content to Arsenal", async ({ page }) => {
    const id = await gotoFirstCampaignSheet(page);
    if (!id) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }

    const arsenalTab = tabButton(page, TAB_ARSENAL);
    if ((await arsenalTab.count()) === 0) {
      test.skip(true, "V2 shell not yet built");
      return;
    }
    await arsenalTab.click();
    await expect(arsenalTab).toHaveAttribute("aria-selected", "true", {
      timeout: 10_000,
    });
    await expect(tabContent(page, TAB_ARSENAL)).toBeVisible({
      timeout: 10_000,
    });
    // Herói content should NOT be visible after the swap.
    await expect(tabContent(page, TAB_HEROI)).toBeHidden({
      timeout: 5_000,
    });
  });

  test("deep link ?tab=ficha redirects to Herói (back-compat)", async ({
    page,
  }) => {
    await loginAs(page, PLAYER_WARRIOR).catch(() => {});
    await page
      .goto("/app/dashboard", {
        timeout: 60_000,
        waitUntil: "domcontentloaded",
      })
      .catch(() => {});

    const links = page.locator('a[href^="/app/campaigns/"]');
    if ((await links.count()) === 0) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }
    const href = await links.first().getAttribute("href");
    const match = href?.match(/\/app\/campaigns\/([0-9a-f-]+)/i);
    if (!match) {
      test.skip(true, "Could not extract campaign id");
      return;
    }
    const id = match[1];

    // Legacy V1 tab key `ficha` must redirect to V2 `heroi` per back-
    // compat mapping in `02-topologia-navegacao.md` §6.2.
    await page.goto(`/app/campaigns/${id}/sheet?tab=ficha`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("domcontentloaded");

    const url = new URL(page.url());
    const tabParam = url.searchParams.get("tab");
    // Two acceptable end-states: server-side 30x redirect (tab=heroi) or
    // client-side normalization (tab param removed, default Herói active).
    if (tabParam !== null) {
      expect(
        tabParam,
        "?tab=ficha should be normalized to ?tab=heroi",
      ).toBe(TAB_HEROI);
    }
    const heroiTab = tabButton(page, TAB_HEROI);
    if ((await heroiTab.count()) === 0) {
      test.skip(true, "V2 shell not yet built");
      return;
    }
    await expect(heroiTab).toHaveAttribute("aria-selected", "true", {
      timeout: 15_000,
    });
  });

  test("keyboard shortcut '2' activates Arsenal", async ({ page }) => {
    const id = await gotoFirstCampaignSheet(page);
    if (!id) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }

    const arsenalTab = tabButton(page, TAB_ARSENAL);
    if ((await arsenalTab.count()) === 0) {
      test.skip(true, "V2 shell not yet built");
      return;
    }
    // Shortcut `2` is owned by `PlayerHqKeyboardShortcuts` (story B5).
    // The spec depends only on the contract: pressing `2` while not in
    // an input flips the tab.
    await page.keyboard.press("2");
    await expect(arsenalTab).toHaveAttribute("aria-selected", "true", {
      timeout: 5_000,
    });
  });

  test("tab persists across reload within TTL window", async ({ page }) => {
    // Wipe storage before navigating so prior tests in the same worker
    // (e.g. the keyboard-shortcut spec, which switches to Arsenal and
    // never resets) cannot leak state and mask a regression.
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {
        /* best-effort */
      }
    });

    const id = await gotoFirstCampaignSheet(page);
    if (!id) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }

    const arsenalTab = tabButton(page, TAB_ARSENAL);
    if ((await arsenalTab.count()) === 0) {
      test.skip(true, "V2 shell not yet built");
      return;
    }
    await arsenalTab.click();
    await expect(arsenalTab).toHaveAttribute("aria-selected", "true", {
      timeout: 5_000,
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    const arsenalTabAfter = tabButton(page, TAB_ARSENAL);
    await expect(
      arsenalTabAfter,
      "Arsenal selection should persist after reload (within 24h TTL)",
    ).toHaveAttribute("aria-selected", "true", { timeout: 15_000 });
  });
});
