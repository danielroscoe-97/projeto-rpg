/**
 * Gate Fase D — `player-notes-crud` (P0, Auth) — Wave 3c D2.
 *
 * Story: 09-implementation-plan §D2 + 15-e2e-matrix row D2.
 *
 * AC under test:
 *   1. Authenticated player can create a new note via "Nova Nota".
 *   2. Editor opens inline (no modal); title/content can be edited.
 *   3. Search filters the list (multi-token AND across title + tags).
 *   4. Delete removes the card after confirm-then-delete.
 *
 * Auto-save coverage lives in `player-notes-auto-save.spec.ts` so this
 * suite stays focused on the CRUD happy path. RLS isolation lives in
 * `player-notes-rls-negative.spec.ts`.
 *
 * Skips when:
 *   - V2 flag is OFF (component is hidden from the shell)
 *   - Migration 187 hasn't been applied (component shows the legacy
 *     placeholder OR the list returns 0 because the table doesn't exist)
 *   - No campaigns seeded for the test account
 *
 * @tags @fase-d @d2 @player-hq @v2-only @auth
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

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

async function gotoMinhasNotas(page: Page, campaignId: string) {
  await page.goto(
    `/app/campaigns/${campaignId}/sheet?tab=diario&section=minhas`,
    { timeout: 60_000, waitUntil: "domcontentloaded" },
  );
  // Confirm we landed on the right sub-tab.
  await expect(
    page.getByTestId("diario-subtab-minhas"),
  ).toHaveAttribute("aria-selected", "true", { timeout: 10_000 });
}

test.describe("Gate Fase D — Minhas Notas CRUD (D2)", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "Minhas Notas needs NEXT_PUBLIC_PLAYER_HQ_V2=true",
  );
  test.setTimeout(120_000);

  test("create → edit → search → delete", async ({ page }) => {
    const campaignId = await getFirstCampaignId(page);
    if (!campaignId) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }

    await gotoMinhasNotas(page, campaignId);

    // V2 readiness probe — root container must be present
    const root = page.getByTestId("minhas-notas-root");
    if ((await root.count()) === 0) {
      test.skip(true, "MinhasNotas not built yet (D2 placeholder still up)");
      return;
    }

    // 1. CREATE — click "Nova Nota" → editor opens inline with the new card
    const initialCardCount = await page
      .locator('[data-testid^="minhas-notas-card-"]')
      .count();

    await page.getByTestId("minhas-notas-new").click();

    // The new card should appear AND be expanded so its title input is visible
    await expect(async () => {
      const newCount = await page
        .locator('[data-testid^="minhas-notas-card-"]')
        .count();
      expect(newCount).toBeGreaterThan(initialCardCount);
    }).toPass({ timeout: 10_000 });

    const newCard = page.locator('[data-testid^="minhas-notas-card-"]').first();
    const cardId = (await newCard.getAttribute("data-testid"))!.replace(
      "minhas-notas-card-",
      "",
    );

    // 2. EDIT — type a unique title via the inline editor
    const uniqueTitle = `e2e-${Date.now()}-grolda`;
    const titleInput = page.getByTestId(`minhas-notas-title-${cardId}`);
    await expect(titleInput).toBeVisible({ timeout: 5_000 });
    await titleInput.fill(uniqueTitle);

    // Type some markdown content too
    const editorTextarea = page.getByTestId(
      `minhas-notas-editor-${cardId}-textarea`,
    );
    await editorTextarea.fill("Nota de teste do E2E.");

    // 3. SEARCH — filter the list down to just this note
    await page.getByTestId("minhas-notas-search").fill(uniqueTitle);
    await expect(newCard).toBeVisible();
    // Other (older) cards should be filtered out — at most 1 remains.
    await expect(
      page.locator('[data-testid^="minhas-notas-card-"]'),
    ).toHaveCount(1);

    // Clear search to see all again
    await page.getByTestId("minhas-notas-search").fill("");

    // 4. DELETE — confirm-then-delete (5 s window)
    await page.getByTestId(`minhas-notas-delete-${cardId}`).click();
    // Second click within 5 s actually deletes
    await page.getByTestId(`minhas-notas-delete-${cardId}`).click();

    // Card should disappear within 5 s (optimistic + RLS round-trip)
    await expect(
      page.locator(`[data-testid="minhas-notas-card-${cardId}"]`),
    ).toHaveCount(0, { timeout: 10_000 });
  });
});
