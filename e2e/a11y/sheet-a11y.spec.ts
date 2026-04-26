/**
 * Gate Fase B — `sheet-a11y` (P0, Auth).
 *
 * Story coverage gap #7 from `_bmad-output/party-mode-2026-04-22/
 * 15-e2e-matrix.md`: today the a11y suite does not run axe against
 * `/sheet`. This spec adds axe coverage for each of the 4 V2 tabs:
 * Herói / Arsenal / Diário / Mapa.
 *
 * Pass condition: zero `critical` and zero `serious` violations on each
 * tab. `moderate`/`minor` violations are reported via the Playwright
 * annotation channel for triage but do not fail the spec — they are
 * tracked separately so the Sprint 3 wrappers do not regress baseline.
 *
 * @tags @fase-b @a11y @player-hq @v2-only
 */

import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

const TABS = ["heroi", "arsenal", "diario", "mapa"] as const;

function tabButton(page: Page, key: string) {
  return page.locator(`#tab-${key}, [data-testid="tab-${key}"]`).first();
}

async function gotoSheet(
  page: Page,
  tab?: (typeof TABS)[number],
): Promise<string | null> {
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
  const url = tab
    ? `/app/campaigns/${match[1]}/sheet?tab=${tab}`
    : `/app/campaigns/${match[1]}/sheet`;
  await page.goto(url, {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
  if (!page.url().includes("/sheet")) return null;
  return match[1];
}

test.describe("Gate Fase B — Sheet a11y axe coverage", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "Sheet a11y specs run only with V2 shell enabled",
  );
  test.setTimeout(120_000);

  for (const tab of TABS) {
    test(`/sheet?tab=${tab} has zero critical/serious axe violations`, async ({
      page,
    }) => {
      const id = await gotoSheet(page, tab);
      if (!id) {
        test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
        return;
      }
      if ((await tabButton(page, tab).count()) === 0) {
        test.skip(true, `V2 shell tab '${tab}' not yet built`);
        return;
      }

      // Wait briefly for any client hydration before scanning.
      await page
        .waitForLoadState("networkidle", { timeout: 10_000 })
        .catch(() => {});

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === "critical",
      );
      const serious = results.violations.filter(
        (v) => v.impact === "serious",
      );
      const moderate = results.violations.filter(
        (v) => v.impact === "moderate",
      );
      const minor = results.violations.filter((v) => v.impact === "minor");

      // Annotate non-blocking violations for triage.
      if (moderate.length > 0 || minor.length > 0) {
        test.info().annotations.push({
          type: "a11y-non-blocking",
          description: `${moderate.length} moderate, ${minor.length} minor violations on tab=${tab} (see test artifacts)`,
        });
      }

      expect(
        critical,
        `tab=${tab}: critical violations: ${critical
          .map((v) => v.id)
          .join(", ")}`,
      ).toEqual([]);
      expect(
        serious,
        `tab=${tab}: serious violations: ${serious
          .map((v) => v.id)
          .join(", ")}`,
      ).toEqual([]);
    });
  }
});
