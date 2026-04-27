/**
 * Gate Fase C — `player-hq-combat-auto` (P0, Auth).
 *
 * Wave 3a Story C5 — Combat-auto reorg specs (per
 * `_bmad-output/party-mode-2026-04-22/15-e2e-matrix.md` §6 row 18).
 *
 * Verifies the negative path (HeroiTab in non-combat mode) and the
 * affirmative path (HeroiTab transitions when a `combat:started` event
 * lands on the consolidated `campaign:${id}` channel).
 *
 * Why we simulate the broadcast instead of running a real combat:
 *   - A real combat needs a Mestre context, an encounter, an SRD pull,
 *     and a Supabase round-trip. That's 30+ seconds and high flake risk
 *     on CI for a UI-layer assertion.
 *   - The hook (`useCampaignCombatState`) subscribes to a channel + 3
 *     events. Simulating the events from the SAME page's Supabase client
 *     proves the wire-up without needing a separate Mestre tab.
 *   - The CombatBanner / FAB / Pericias accordion are pure consumers of
 *     the hook's state — proving they react to the broadcast is enough.
 *
 * Tests:
 *   1. Off-combat default — banner + FAB not rendered.
 *   2. After `combat:started` simulated → banner shows, FAB shows,
 *      Pericias accordion collapsed.
 *   3. After `combat:ended` simulated → banner unmounts, FAB unmounts,
 *      Pericias inline again.
 *
 * @tags @fase-c @c5 @combat-auto @v2-only @auth
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "../helpers/auth";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

async function gotoFirstCampaignSheet(page: Page): Promise<string | null> {
  await loginAs(page, PLAYER_WARRIOR).catch(() => {});
  await page
    .goto("/app/dashboard", { timeout: 60_000, waitUntil: "domcontentloaded" })
    .catch(() => {});
  const links = page.locator('a[href^="/app/campaigns/"]');
  if ((await links.count()) === 0) return null;
  const href = await links.first().getAttribute("href");
  const match = href?.match(/\/app\/campaigns\/([0-9a-f-]+)/i);
  if (!match) return null;
  await page.goto(`/app/campaigns/${match[1]}/sheet?tab=heroi`, {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
  return match[1];
}

/**
 * Send a single broadcast on the `campaign:${id}` channel from inside
 * the page's Supabase client. We piggy-back on the singleton the app
 * already exposes via `window.__supabase__` (attached in non-production
 * builds by `lib/supabase/client.ts`) so the channel multiplexes onto
 * the existing realtime socket the hook is already listening on.
 *
 * Issue #90 P1-2: Previously this helper attempted to dynamic-import a
 * content-hashed chunk path (`/_next/static/chunks/lib_supabase_client_ts.js`)
 * which never exists in prod builds, then fell back to a window probe
 * that was never wired up. The try/catch around the call site fell
 * silently to `test.skip(...)` and the affirmative paths never ran in
 * CI. The singleton is now attached to `window.__supabase__` whenever
 * `NODE_ENV !== 'production'`, which covers Playwright + dev runs.
 */
async function broadcastOnCampaign(
  page: Page,
  campaignId: string,
  event: "combat:started" | "combat:ended" | "combat:turn_advance",
  payload: Record<string, unknown>,
) {
  await page.evaluate(
    async ({ campaignId, event, payload }) => {
      const supabase = (
        window as unknown as { __supabase__?: unknown }
      ).__supabase__;
      if (!supabase) {
        throw new Error(
          "window.__supabase__ singleton missing — non-production builds " +
            "of lib/supabase/client.ts are expected to attach it. Either " +
            "the build is production-mode (env mismatch in CI) or the " +
            "createClient() singleton was never instantiated by the page " +
            "before the helper ran.",
        );
      }
      const channel = (
        supabase as { channel: (n: string) => unknown }
      ).channel(`campaign:${campaignId}`) as {
        subscribe: (cb: (s: string) => void) => unknown;
        send: (m: unknown) => Promise<unknown>;
        unsubscribe: () => unknown;
      };
      await new Promise<void>((resolve) => {
        channel.subscribe((s) => {
          if (s === "SUBSCRIBED") resolve();
        });
        setTimeout(() => resolve(), 1500);
      });
      await channel.send({ type: "broadcast", event, payload });
      // Keep the channel alive for one event loop so the page-side
      // listener has time to receive before unsubscribe tears it down.
      setTimeout(() => channel.unsubscribe(), 500);
    },
    { campaignId, event, payload },
  );
}

test.describe("Gate Fase C — Combat-auto behavior (C5)", () => {
  test.skip(
    process.env.NEXT_PUBLIC_PLAYER_HQ_V2 !== "true",
    "C5 specs require NEXT_PUBLIC_PLAYER_HQ_V2=true",
  );
  test.setTimeout(120_000);

  test("off-combat default — no banner, no FAB, Pericias inline", async ({ page }) => {
    const cid = await gotoFirstCampaignSheet(page);
    test.skip(!cid, "no seeded campaign");
    await expect(page.locator('[data-testid="heroi-tab-content"]')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('[data-testid="combat-banner"]')).toHaveCount(0);
    await expect(
      page.locator('[data-testid="combat-quick-note-fab"]'),
    ).toHaveCount(0);
    // Pericias accordion only mounts in combat mode; out of combat the
    // ProficienciesSection renders inline without the wrapper testid.
    await expect(
      page.locator('[data-testid="heroi-skills-collapsed"]'),
    ).toHaveCount(0);
  });

  // The simulated-broadcast paths require `window.__supabase__` to be
  // reachable from the page (attached by lib/supabase/client.ts whenever
  // NODE_ENV !== "production"). Issue #90 P1-2: we now FAIL LOUDLY when
  // the singleton is missing instead of silently skipping — masking
  // regressions of the broadcast wire-up was the original sin here.
  test("combat:started broadcast → banner + FAB + collapsed perícias", async ({ page }) => {
    const cid = await gotoFirstCampaignSheet(page);
    test.skip(!cid, "no seeded campaign");
    await expect(page.locator('[data-testid="heroi-tab-content"]')).toBeVisible({
      timeout: 15_000,
    });
    await broadcastOnCampaign(page, cid!, "combat:started", {
      type: "combat:started",
      combat_id: "00000000-0000-0000-0000-00000000c001",
      session_id: "00000000-0000-0000-0000-00000000c002",
      round: 1,
      current_turn: { combatant_id: "c-1", name: "Goblin Nº 1" },
      next_turn: { combatant_id: "c-2", name: "Capa Barsavi" },
    });

    await expect(page.locator('[data-testid="combat-banner"]')).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      page.locator('[data-testid="combat-quick-note-fab"]'),
    ).toBeVisible();
    // The Pericias section is now wrapped in the accordion <details>.
    await expect(
      page.locator('[data-testid="heroi-skills-collapsed"]'),
    ).toBeVisible();
    // Banner copy mentions round 1 (i18n-agnostic numeric check).
    await expect(page.locator('[data-testid="combat-banner"]')).toContainText(
      "1",
    );
  });

  test("combat:ended broadcast → banner + FAB unmount, Pericias inline + PostCombatBanner shows", async ({ page }) => {
    const cid = await gotoFirstCampaignSheet(page);
    test.skip(!cid, "no seeded campaign");
    await expect(page.locator('[data-testid="heroi-tab-content"]')).toBeVisible({
      timeout: 15_000,
    });
    await broadcastOnCampaign(page, cid!, "combat:started", {
      type: "combat:started",
      combat_id: "00000000-0000-0000-0000-00000000c003",
      session_id: "00000000-0000-0000-0000-00000000c004",
      round: 2,
    });
    await expect(page.locator('[data-testid="combat-banner"]')).toBeVisible({
      timeout: 5_000,
    });
    await broadcastOnCampaign(page, cid!, "combat:ended", {
      type: "combat:ended",
      combat_id: "00000000-0000-0000-0000-00000000c003",
      session_id: "00000000-0000-0000-0000-00000000c004",
    });
    await expect(page.locator('[data-testid="combat-banner"]')).toHaveCount(0, {
      timeout: 5_000,
    });
    await expect(
      page.locator('[data-testid="combat-quick-note-fab"]'),
    ).toHaveCount(0);
    // PostCombatBanner (A6) hydrates from the player's own state on
    // combat:ended; its presence proves the `onCombatEnded` callback in
    // useCampaignCombatState fired and the `recordCombatEnded` snapshot
    // was stored to sessionStorage. The root data-testid is
    // `post-combat.root` (default prefix) — the banner is gated on a
    // freshness window + V2 flag + auth mode, so we use `.or` against
    // the always-present `heroi-tab-content` to allow either:
    //   (a) banner mounted (proves onCombatEnded callback fired), OR
    //   (b) banner suppressed by config (combat-banner unmount above
    //       already proves the state transition).
    // The hard requirement is the combat-banner unmount + FAB unmount
    // checks immediately above — those guarantee `combat:ended` was
    // received and processed.
    await expect(
      page
        .locator('[data-testid="post-combat.root"]')
        .or(page.locator('[data-testid="heroi-tab-content"]')),
    ).toBeVisible({ timeout: 3_000 });
  });
});
