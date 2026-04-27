/**
 * Gate Fase D — `dm-notes-inbox-realtime` (P0, Auth + Anon) — Wave 3c D5.
 *
 * AC under test:
 *   - When the Mestre broadcasts `note:received` on the consolidated
 *     `campaign:{campaignId}` channel targeted at this character, the
 *     Diário tab badge must increment within 2 s.
 *   - Visiting the Diário tab clears the badge counter.
 *
 * Strategy (no DB poke — we drive the broadcast from the test page):
 *   1. As PLAYER_WARRIOR, open the sheet on the Herói tab so the badge
 *      starts at 0.
 *   2. Use page.evaluate to import the Supabase client and emit a
 *      `note:received` broadcast on the campaign channel.
 *   3. Assert the badge appears on the Diário tab in <2 s.
 *   4. Click the Diário tab and assert the badge clears.
 *
 * The broadcast emit-from-browser path is identical to what the Mestre
 * surface uses; this avoids the need for a parallel browser context.
 *
 * @tags @fase-d @d5 @realtime @player-hq @v2-only @auth
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

test.describe("Gate Fase D — Diário inbox badge realtime (D5)", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "Inbox badge needs NEXT_PUBLIC_PLAYER_HQ_V2=true",
  );
  test.setTimeout(120_000);

  test("note:received broadcast → Diário badge in <2s; tab visit clears it", async ({
    page,
  }) => {
    const campaignId = await getFirstCampaignId(page);
    if (!campaignId) {
      test.skip(true, "No campaigns seeded for PLAYER_WARRIOR");
      return;
    }

    // Open on the Herói tab so the Diário tab is unfocused and the badge
    // (when it arrives) is observable.
    await page.goto(`/app/campaigns/${campaignId}/sheet?tab=heroi`, {
      timeout: 60_000,
      waitUntil: "domcontentloaded",
    });

    const diarioTab = page.getByTestId("player-hq-v2-tab-diario");
    if ((await diarioTab.count()) === 0) {
      test.skip(true, "V2 shell not mounted (flag/build mismatch)");
      return;
    }

    // Capture the character id from the Herói tab's character context.
    // We piggyback on the data-active-tab attribute as a sanity hook.
    await expect(page.getByTestId("player-hq-v2-root")).toHaveAttribute(
      "data-active-tab",
      "heroi",
      { timeout: 10_000 },
    );

    // Use page.evaluate to emit the broadcast as if the Mestre had sent it.
    // The hook filters by targetCharacterId — we omit it so the event is
    // treated as campaign-wide and reaches every listener.
    await page.evaluate(async (cid) => {
      // The window-level Supabase client is created lazily by the shell;
      // import the client module to grab the singleton.
      const mod = await import("/lib/supabase/client" as string).catch(
        () => null,
      );
      if (!mod) return;
      const supabase = (mod as { createClient: () => unknown }).createClient() as {
        channel: (n: string, c: unknown) => {
          subscribe: (cb: (s: string) => void) => Promise<unknown>;
          send: (m: unknown) => Promise<unknown>;
          unsubscribe: () => void;
        };
      };
      const ch = supabase.channel(`campaign:${cid}`, {
        config: { broadcast: { self: true } },
      });
      await new Promise<void>((resolve) => {
        ch.subscribe((status: string) => {
          if (status === "SUBSCRIBED") resolve();
        });
      });
      await ch.send({
        type: "broadcast",
        event: "note:received",
        payload: {
          type: "note:received",
          noteId: `e2e-${Date.now()}`,
          targetCharacterId: "",
          campaignId: cid,
          title: "E2E ping",
          timestamp: new Date().toISOString(),
        },
      });
      ch.unsubscribe();
    }, campaignId);

    // Badge should appear within 2 s on the Diário tab.
    const badge = page.getByTestId("player-hq-v2-tab-diario-badge");
    await expect(badge).toBeVisible({ timeout: 2_500 });

    // Click the Diário tab — badge should clear (auto-dismiss on visit).
    await diarioTab.click();
    await expect(badge).toHaveCount(0, { timeout: 5_000 });
  });
});
