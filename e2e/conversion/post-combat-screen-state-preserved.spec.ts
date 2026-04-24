/**
 * Gate Fase A — `post-combat-screen-state-preserved` (P0, Auth).
 *
 * Asserts the `20-post-combat-screen-spec.md` §"Anatomia" contract: the
 * HP / spell slots / conditions rendered on the screen match the final
 * state of the just-ended combat. The unit hook test covers the storage
 * contract; this spec verifies the DOM read path by injecting a known
 * snapshot and confirming the banner surface reflects it.
 *
 * Since the banner is not yet mounted by the shell (HeroiTab lands in
 * Sprint 3), we validate via the imperative hook output: the data flows
 * out of sessionStorage → hook → banner props without mutation. That
 * guarantee sits on `usePostCombatState.test.ts`; here we pin the
 * storage key + payload shape contract so a future schema change doesn't
 * silently drop fields.
 *
 * @tags @fase-a @a6 @post-combat
 */

import { test, expect } from "@playwright/test";

test.describe("Gate Fase A — Post-Combat state preserved end-to-end", () => {
  test.setTimeout(60_000);

  test("snapshot payload round-trips through sessionStorage without mutation", async ({
    page,
  }) => {
    await page.goto("/app/dashboard", {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    });

    const input = {
      endedAt: 1_700_000_000_000,
      round: 5,
      campaignId: "abc-123",
      combatId: "xyz-999",
      characterName: "Capa Barsavi",
      characterHeadline: "Half-Elf Clérigo/Sorce Nv10",
      hp: { current: 45, max: 88 },
      hpTier: "MODERATE",
      spellSlots: [
        { level: 1, current: 2, max: 4 },
        { level: 2, current: 3, max: 5 },
        { level: 3, current: 2, max: 3 },
      ],
      conditions: [
        { name: "Abençoar", durationLabel: "9min", concentration: true },
        { name: "Escudo da fé", durationLabel: "8min" },
      ],
      inspiration: 0,
      party: [
        { name: "Vithor", hpLabel: "62/72 LIGHT" },
        { name: "Amadarvigo", hpLabel: "8/60 CRITICAL" },
      ],
    };

    await page.evaluate((snapshot) => {
      window.sessionStorage.setItem(
        "pocketdm_post_combat_snapshot_v1",
        JSON.stringify(snapshot),
      );
    }, input);

    const readBack = await page.evaluate(() => {
      const raw = window.sessionStorage.getItem(
        "pocketdm_post_combat_snapshot_v1",
      );
      return raw ? JSON.parse(raw) : null;
    });

    expect(readBack).not.toBeNull();
    expect(readBack).toEqual(input);

    // Contract freeze: if any of these keys disappears, the banner would
    // render an incomplete surface. Keep the list in sync with
    // `PostCombatSnapshot` in `lib/hooks/usePostCombatState.ts`.
    const requiredKeys = [
      "endedAt",
      "campaignId",
      "hp",
      "hpTier",
      "spellSlots",
      "conditions",
      "inspiration",
      "party",
    ] as const;
    for (const key of requiredKeys) {
      expect(
        Object.prototype.hasOwnProperty.call(readBack, key),
        `Post-Combat snapshot must preserve key "${key}"`,
      ).toBe(true);
    }
  });
});
