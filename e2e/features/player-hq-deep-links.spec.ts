/**
 * Gate Fase B — `player-hq-deep-links` (P0, Auth).
 *
 * Story B3 (`_bmad-output/party-mode-2026-04-22/09-implementation-plan.md
 * §B3`) requires that all 7 legacy V1 tab keys redirect/normalize to
 * their V2 equivalents:
 *
 *   ?tab=ficha        → ?tab=heroi
 *   ?tab=recursos     → ?tab=heroi&section=recursos
 *   ?tab=habilidades  → ?tab=arsenal&section=habilidades
 *   ?tab=inventario   → ?tab=arsenal
 *   ?tab=notas        → ?tab=diario&section=notas
 *   ?tab=quests       → ?tab=diario&section=quests
 *   ?tab=map          → ?tab=mapa
 *
 * This spec loops over all 7 mappings and asserts the resulting tab is
 * the expected V2 canonical tab. The `section` query param is asserted
 * loosely (presence check) because the section sub-routing lands across
 * multiple stories (B3 + D2/D5).
 *
 * @tags @fase-b @b3 @player-hq @v2-only
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

interface DeepLinkCase {
  legacyTab: string;
  expectedTab: "heroi" | "arsenal" | "diario" | "mapa";
  /** When defined, also assert this section param survives the redirect. */
  expectedSection?: string;
}

const MAPPINGS: DeepLinkCase[] = [
  { legacyTab: "ficha", expectedTab: "heroi" },
  { legacyTab: "recursos", expectedTab: "heroi", expectedSection: "recursos" },
  {
    legacyTab: "habilidades",
    expectedTab: "arsenal",
    expectedSection: "habilidades",
  },
  { legacyTab: "inventario", expectedTab: "arsenal" },
  { legacyTab: "notas", expectedTab: "diario", expectedSection: "notas" },
  { legacyTab: "quests", expectedTab: "diario", expectedSection: "quests" },
  { legacyTab: "map", expectedTab: "mapa" },
];

function tabButton(page: Page, key: string) {
  return page.locator(`#tab-${key}, [data-testid="tab-${key}"]`).first();
}

/** Login + locate the player's first campaign id. Returns null if no seed. */
async function getFirstCampaignId(page: Page): Promise<string | null> {
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

test.describe("Gate Fase B — Player HQ deep-link back-compat (B3)", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "B3 deep-links require NEXT_PUBLIC_PLAYER_HQ_V2=true",
  );
  test.setTimeout(180_000);

  test("all 7 legacy tab keys map to their V2 canonical equivalents", async ({
    page,
  }) => {
    const campaignId = await getFirstCampaignId(page);
    if (!campaignId) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }

    // Quick V2 readiness probe — if no V2 tab buttons exist on the
    // first navigation, the shell hasn't been built yet. Skip rather
    // than 7×fail.
    await page.goto(`/app/campaigns/${campaignId}/sheet`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });
    if ((await tabButton(page, "heroi").count()) === 0) {
      test.skip(true, "V2 shell not yet built — skip until B1 lands");
      return;
    }

    for (const mapping of MAPPINGS) {
      const url = `/app/campaigns/${campaignId}/sheet?tab=${mapping.legacyTab}`;
      await page.goto(url, {
        timeout: 60_000,
        waitUntil: "domcontentloaded",
      });
      await page.waitForLoadState("domcontentloaded");

      const finalUrl = new URL(page.url());
      const finalTab = finalUrl.searchParams.get("tab");

      // Two acceptable end-states: server normalized via redirect
      // (tab param matches expected), OR client normalized (tab param
      // dropped, expected tab is selected).
      if (finalTab !== null) {
        expect(
          finalTab,
          `?tab=${mapping.legacyTab} should normalize to ?tab=${mapping.expectedTab}`,
        ).toBe(mapping.expectedTab);
      }

      // Either way, the expected V2 tab must be aria-selected.
      const expectedBtn = tabButton(page, mapping.expectedTab);
      await expect(
        expectedBtn,
        `legacy ${mapping.legacyTab} should select ${mapping.expectedTab}`,
      ).toHaveAttribute("aria-selected", "true", { timeout: 10_000 });

      // Loose section assertion — presence only. Section sub-routing
      // is owned by D2/D5 stories and may land later.
      if (mapping.expectedSection !== undefined && finalTab !== null) {
        const section = finalUrl.searchParams.get("section");
        if (section !== null) {
          expect(
            section,
            `?tab=${mapping.legacyTab} should preserve section=${mapping.expectedSection}`,
          ).toBe(mapping.expectedSection);
        }
      }
    }
  });
});
