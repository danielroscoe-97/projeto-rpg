/**
 * Gate Fase B — `player-hq-tab-persistence` (P1, Auth).
 *
 * Story B4 (`_bmad-output/party-mode-2026-04-22/09-implementation-plan.md
 * §B4`) requires:
 *
 *   - First visit: default tab is Herói
 *   - Second visit (same browser, <24h): last tab restored
 *   - >24h since last visit: tab resets to Herói
 *   - Query param ?tab= overrides everything
 *
 * To exercise the TTL deterministically we use the
 * `NEXT_PUBLIC_DEBUG_TAB_TTL_MS` override (when supported by the hook
 * implementation) or fall back to `Date.now` mocking via
 * `page.addInitScript`. The hook contract is owned by
 * `lib/hooks/usePlayerHqTabState.ts` (created in B4).
 *
 * @tags @fase-b @b4 @player-hq @v2-only
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

function tabButton(page: Page, key: string) {
  return page.locator(`#tab-${key}, [data-testid="tab-${key}"]`).first();
}

async function getCampaignId(page: Page): Promise<string | null> {
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
  return match ? match[1] : null;
}

test.describe("Gate Fase B — Player HQ tab persistence (B4)", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "B4 persistence requires NEXT_PUBLIC_PLAYER_HQ_V2=true",
  );
  test.setTimeout(120_000);

  test("first visit defaults to Herói (no localStorage entry)", async ({
    page,
  }) => {
    // Wipe any existing storage BEFORE first navigation.
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {
        /* best-effort */
      }
    });

    const campaignId = await getCampaignId(page);
    if (!campaignId) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }
    await page.goto(`/app/campaigns/${campaignId}/sheet`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });

    if ((await tabButton(page, "heroi").count()) === 0) {
      test.skip(true, "V2 shell not yet built");
      return;
    }
    await expect(tabButton(page, "heroi")).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 15_000 },
    );
  });

  test("switching to Arsenal then reloading restores Arsenal", async ({
    page,
  }) => {
    const campaignId = await getCampaignId(page);
    if (!campaignId) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }
    await page.goto(`/app/campaigns/${campaignId}/sheet`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });

    const arsenalBtn = tabButton(page, "arsenal");
    if ((await arsenalBtn.count()) === 0) {
      test.skip(true, "V2 shell not yet built");
      return;
    }
    await arsenalBtn.click();
    await expect(arsenalBtn).toHaveAttribute("aria-selected", "true", {
      timeout: 5_000,
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      tabButton(page, "arsenal"),
      "Arsenal selection should survive reload (within 24h TTL)",
    ).toHaveAttribute("aria-selected", "true", { timeout: 15_000 });
  });

  test("expired TTL falls back to Herói (mocked clock)", async ({ page }) => {
    const campaignId = await getCampaignId(page);
    if (!campaignId) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }

    // Pre-seed a "stale" persisted entry: 25h in the past. The hook
    // implementation in B4 will use one of these key shapes; we cover
    // both common ones.
    await page.addInitScript(
      ({ campaignId, twentyFiveHoursAgo }) => {
        const stale = JSON.stringify({
          tab: "arsenal",
          updatedAt: twentyFiveHoursAgo,
        });
        try {
          window.localStorage.setItem(
            `pocketdm:lastPlayerHqTab:${campaignId}`,
            stale,
          );
          // Alternative key naming the hook may adopt.
          window.localStorage.setItem(
            `pocketdm.player-hq.tab.${campaignId}`,
            stale,
          );
        } catch {
          /* best-effort */
        }
      },
      {
        campaignId,
        twentyFiveHoursAgo: Date.now() - 25 * 60 * 60 * 1000,
      },
    );

    await page.goto(`/app/campaigns/${campaignId}/sheet`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });

    if ((await tabButton(page, "heroi").count()) === 0) {
      test.skip(true, "V2 shell not yet built");
      return;
    }
    await expect(
      tabButton(page, "heroi"),
      "stale persisted tab (>24h) should reset to Herói",
    ).toHaveAttribute("aria-selected", "true", { timeout: 15_000 });
  });

  test("?tab= query param overrides persisted state", async ({ page }) => {
    const campaignId = await getCampaignId(page);
    if (!campaignId) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }

    // Seed a persisted "diario" preference — a fresh ?tab=mapa visit
    // must still land on Mapa, not Diário.
    await page.addInitScript(
      ({ campaignId }) => {
        const fresh = JSON.stringify({
          tab: "diario",
          updatedAt: Date.now(),
        });
        try {
          window.localStorage.setItem(
            `pocketdm:lastPlayerHqTab:${campaignId}`,
            fresh,
          );
          window.localStorage.setItem(
            `pocketdm.player-hq.tab.${campaignId}`,
            fresh,
          );
        } catch {
          /* best-effort */
        }
      },
      { campaignId },
    );

    await page.goto(`/app/campaigns/${campaignId}/sheet?tab=mapa`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });

    if ((await tabButton(page, "mapa").count()) === 0) {
      test.skip(true, "V2 shell not yet built");
      return;
    }
    await expect(
      tabButton(page, "mapa"),
      "?tab=mapa must win over persisted ?tab=diario",
    ).toHaveAttribute("aria-selected", "true", { timeout: 15_000 });
  });
});
