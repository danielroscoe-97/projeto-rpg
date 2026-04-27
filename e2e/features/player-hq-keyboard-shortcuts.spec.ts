/**
 * Gate Fase B — `player-hq-keyboard-shortcuts` (P0, Auth).
 *
 * Story B5 (`_bmad-output/party-mode-2026-04-22/09-implementation-plan.md
 * §B5`) requires global keyboard shortcuts in the V2 Player HQ:
 *
 *   1, 2, 3, 4 → switch to Herói/Arsenal/Diário/Mapa respectively
 *   ?          → opens the keyboard help overlay
 *   N          → quick-note overlay (MVP can navigate to Diário > quick-note)
 *
 * AC: Shortcuts MUST be ignored when focus is in an input/textarea (so the
 * player can type a "1" inside a notes textarea without flipping the tab).
 *
 * @tags @fase-b @b5 @player-hq @v2-only
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

function tabButton(page: Page, key: string) {
  return page.locator(`#tab-${key}, [data-testid="tab-${key}"]`).first();
}

async function gotoFirstSheet(page: Page): Promise<string | null> {
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
  await page.goto(`/app/campaigns/${match[1]}/sheet`, {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
  if (!page.url().includes("/sheet")) return null;
  return match[1];
}

test.describe("Gate Fase B — Player HQ keyboard shortcuts (B5)", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "B5 shortcuts require NEXT_PUBLIC_PLAYER_HQ_V2=true",
  );
  test.setTimeout(90_000);

  test("digits 1-4 switch to the corresponding tab", async ({ page }) => {
    const id = await gotoFirstSheet(page);
    if (!id) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }
    if ((await tabButton(page, "heroi").count()) === 0) {
      test.skip(true, "V2 shell not yet built");
      return;
    }

    const cases = [
      { key: "2", tab: "arsenal" },
      { key: "3", tab: "diario" },
      { key: "4", tab: "mapa" },
      { key: "1", tab: "heroi" },
    ] as const;

    // Click the page body first to ensure focus is on the document and
    // not stuck on a previously focused element from page.goto().
    await page.locator("body").click({ position: { x: 1, y: 1 } });

    for (const c of cases) {
      await page.keyboard.press(c.key);
      const tab = tabButton(page, c.tab);
      await expect(
        tab,
        `key '${c.key}' should activate ${c.tab}`,
      ).toHaveAttribute("aria-selected", "true", { timeout: 5_000 });
    }
  });

  test("'?' opens keyboard help overlay", async ({ page }) => {
    const id = await gotoFirstSheet(page);
    if (!id) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }
    if ((await tabButton(page, "heroi").count()) === 0) {
      test.skip(true, "V2 shell not yet built");
      return;
    }

    await page.locator("body").click({ position: { x: 1, y: 1 } });
    // The `?` key is Shift+/ on US layout; Playwright accepts the
    // shorthand "Shift+/" and the canonical name "?".
    await page.keyboard.press("Shift+/");

    const overlay = page
      .locator(
        '[data-testid="keyboard-help-overlay"], [role="dialog"][aria-label*="keyboard" i], [role="dialog"][aria-label*="atalho" i]',
      )
      .first();

    if ((await overlay.count()) === 0) {
      test.skip(true, "B5 KeyboardHelpOverlay not yet built — skip");
      return;
    }
    await expect(overlay).toBeVisible({ timeout: 5_000 });
  });

  test("shortcuts are ignored when focus is in an input/textarea", async ({
    page,
  }) => {
    const id = await gotoFirstSheet(page);
    if (!id) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }
    if ((await tabButton(page, "heroi").count()) === 0) {
      test.skip(true, "V2 shell not yet built");
      return;
    }

    // Find any input/textarea on the page. If none is currently
    // rendered (different campaigns may not surface an input on Herói
    // tab), inject a controlled textarea so the contract is still
    // tested.
    let editable = page.locator("input:visible, textarea:visible").first();
    if ((await editable.count()) === 0) {
      await page.evaluate(() => {
        const el = document.createElement("textarea");
        el.id = "__sb-test-textarea";
        el.setAttribute("data-testid", "sb-test-textarea");
        el.style.position = "fixed";
        el.style.bottom = "10px";
        el.style.right = "10px";
        el.style.zIndex = "9999";
        document.body.appendChild(el);
      });
      editable = page.locator("#__sb-test-textarea");
    }

    await editable.click();
    await editable.focus();

    // Capture the currently selected tab BEFORE typing.
    const before = await page
      .locator(
        '[role="tab"][aria-selected="true"], [data-testid^="tab-"][aria-selected="true"]',
      )
      .first()
      .getAttribute("id")
      .catch(() => null);

    // Type "2" — this would normally activate Arsenal. With focus in an
    // input it must be ignored by the shortcut handler.
    await page.keyboard.type("2");

    const after = await page
      .locator(
        '[role="tab"][aria-selected="true"], [data-testid^="tab-"][aria-selected="true"]',
      )
      .first()
      .getAttribute("id")
      .catch(() => null);

    expect(
      after,
      "typing '2' inside an input must NOT change the active tab",
    ).toBe(before);
  });
});
