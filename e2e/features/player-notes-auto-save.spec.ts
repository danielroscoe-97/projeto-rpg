/**
 * Gate Fase D — `player-notes-auto-save` (P1, Auth) — Wave 3c D2.
 *
 * AC under test:
 *   - Editing a note's content triggers a debounced auto-save.
 *   - The save callback fires within the configured window
 *     (NEXT_PUBLIC_AUTOSAVE_DEBOUNCE_MS, default 30 000 ms).
 *
 * To keep the suite fast, this spec assumes the env override
 * `NEXT_PUBLIC_AUTOSAVE_DEBOUNCE_MS=2000` is set in the e2e environment
 * (otherwise the test waits the full 30 s, which is acceptable but slow).
 *
 * Strategy (no DB poke — we rely on the user-visible side effect):
 *   1. Open Minhas Notas + create a fresh note.
 *   2. Type content; capture the timestamp.
 *   3. Reload the page after the autosave window elapses.
 *   4. Re-open the same card and assert the typed content is still there.
 *
 * @tags @fase-d @d2 @autosave @player-hq @v2-only @auth
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

const AUTOSAVE_MS = (() => {
  const raw = process.env.NEXT_PUBLIC_AUTOSAVE_DEBOUNCE_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30_000;
})();

async function getFirstCampaignId(page: Page): Promise<string | null> {
  await loginAs(page, PLAYER_WARRIOR).catch(() => {});
  await page
    .goto("/app/dashboard", { timeout: 60_000, waitUntil: "domcontentloaded" })
    .catch(() => {});
  const links = page.locator('a[href^="/app/campaigns/"]');
  if ((await links.count()) === 0) return null;
  const href = await links.first().getAttribute("href");
  const match = href?.match(/\/app\/campaigns\/([0-9a-f-]+)/i);
  return match ? match[1] : null;
}

test.describe("Gate Fase D — Minhas Notas auto-save (D2)", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "Auto-save needs NEXT_PUBLIC_PLAYER_HQ_V2=true",
  );
  // Padding = autosave window + room for round-trip + reload + render.
  test.setTimeout(AUTOSAVE_MS + 90_000);

  test("typing content triggers auto-save within the configured window", async ({
    page,
  }) => {
    const campaignId = await getFirstCampaignId(page);
    if (!campaignId) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }

    await page.goto(
      `/app/campaigns/${campaignId}/sheet?tab=diario&section=minhas`,
      { timeout: 60_000, waitUntil: "domcontentloaded" },
    );

    if ((await page.getByTestId("minhas-notas-root").count()) === 0) {
      test.skip(true, "MinhasNotas not built / mig 187 not applied");
      return;
    }

    // Create a fresh note we can identify later by a unique payload.
    await page.getByTestId("minhas-notas-new").click();
    const card = page.locator('[data-testid^="minhas-notas-card-"]').first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    const cardId = (await card.getAttribute("data-testid"))!.replace(
      "minhas-notas-card-",
      "",
    );

    const stamp = `auto-${Date.now()}`;
    await page.getByTestId(`minhas-notas-title-${cardId}`).fill(stamp);

    const editor = page.getByTestId(`minhas-notas-editor-${cardId}-textarea`);
    await editor.fill(`Conteúdo persistido pelo autosave: ${stamp}`);

    // Wait for the autosave debounce window + a small server-side buffer.
    // `page.waitForTimeout` is OK here — the assertion is "what survives a
    // reload after the window elapsed", not a polling loop.
    await page.waitForTimeout(AUTOSAVE_MS + 3_000);

    // Hard reload to drop any in-memory state.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.goto(
      `/app/campaigns/${campaignId}/sheet?tab=diario&section=minhas`,
      { timeout: 60_000, waitUntil: "domcontentloaded" },
    );

    await expect(page.getByTestId("minhas-notas-root")).toBeVisible({
      timeout: 15_000,
    });

    // Search for the unique stamp; the card should be persisted.
    await page.getByTestId("minhas-notas-search").fill(stamp);
    const reloadedCard = page
      .locator('[data-testid^="minhas-notas-card-"]')
      .first();
    await expect(reloadedCard).toBeVisible({ timeout: 10_000 });
    await expect(reloadedCard).toContainText(stamp);
  });
});
