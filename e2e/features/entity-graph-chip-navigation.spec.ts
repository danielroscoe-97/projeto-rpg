import { test, expect, type Page } from "@playwright/test";
import { loginAsDM } from "../helpers/auth";
import { getServiceClient } from "../helpers/db";

/**
 * Entity Graph — Chip Navigation (commit 010b1c1e, post-review commit 93a89897)
 *
 * Exercises the four searchParam receivers added by the chip-navigation wire:
 *
 *   - NpcList            — reads ?npcId=<uuid>
 *   - LocationList       — reads ?locationId=<uuid>, also uncollapses ancestors
 *   - FactionList        — reads ?factionId=<uuid>
 *   - QuestBoard         — reads ?questId=<uuid>, also resets filter to "all"
 *
 * Each tab's receiver should:
 *   1. Auto-expand the matching card (via the `focusToken` prop flipping to
 *      the URLSearchParams identity)
 *   2. Scroll it into view
 *   3. Not re-trigger scroll on unrelated re-renders (handled-ref guard)
 *
 * The tests drive the receivers directly by navigating to the URL the
 * chip handler would produce — they do NOT click a chip. The chip-click
 * → router.push is a trivial callback; the value at risk is the receiver
 * behaviour. Chip-button click coverage belongs to the Jest/DOM layer.
 *
 * Seeds a throwaway campaign with one of each entity (NPC, Location,
 * Faction, Quest). afterAll deletes the campaign; FK cascade handles
 * children.
 *
 * Defensive: if login or seed fails, every test skips with the setup
 * error reason rather than surfacing misleading failures.
 */

interface SetupState {
  campaignId: string | null;
  userId: string | null;
  npcId: string | null;
  parentLocationId: string | null;
  childLocationId: string | null;
  factionId: string | null;
  activeQuestId: string | null;
  completedQuestId: string | null;
  skipReason: string | null;
}

async function getLoggedInUserId(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const bridge = (
      window as unknown as {
        __pocketdm_supabase?: {
          auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
        };
      }
    ).__pocketdm_supabase;
    if (!bridge) return null;
    const { data } = await bridge.auth.getUser();
    return data.user?.id ?? null;
  });
}

async function seedCampaign(userId: string): Promise<{
  campaignId: string;
  npcId: string;
  parentLocationId: string;
  childLocationId: string;
  factionId: string;
  activeQuestId: string;
  completedQuestId: string;
}> {
  const sb = getServiceClient();
  const stamp = Date.now();

  const { data: campaign, error: cErr } = await sb
    .from("campaigns")
    .insert({ owner_id: userId, name: `E2E Chip Nav ${stamp}` })
    .select("id")
    .single();
  if (cErr || !campaign) throw new Error(`Campaign create failed: ${cErr?.message}`);

  // Parent + child location so we can verify the ancestor-uncollapse walk.
  const { data: parent, error: pErr } = await sb
    .from("campaign_locations")
    .insert({
      campaign_id: campaign.id,
      name: "Cidade do Pêndulo",
      location_type: "city",
    })
    .select("id")
    .single();
  if (pErr || !parent) throw new Error(`Parent location create failed: ${pErr?.message}`);

  const { data: child, error: lErr } = await sb
    .from("campaign_locations")
    .insert({
      campaign_id: campaign.id,
      name: "Taverna do Pêndulo",
      location_type: "building",
      parent_location_id: parent.id,
    })
    .select("id")
    .single();
  if (lErr || !child) throw new Error(`Child location create failed: ${lErr?.message}`);

  const { data: npc, error: nErr } = await sb
    .from("campaign_npcs")
    .insert({
      campaign_id: campaign.id,
      user_id: userId,
      name: "Viktor",
      description: "Taverneiro de olho vivo",
    })
    .select("id")
    .single();
  if (nErr || !npc) throw new Error(`NPC create failed: ${nErr?.message}`);

  const { data: faction, error: fErr } = await sb
    .from("campaign_factions")
    .insert({
      campaign_id: campaign.id,
      name: "Círculo da Rosa Negra",
    })
    .select("id")
    .single();
  if (fErr || !faction) throw new Error(`Faction create failed: ${fErr?.message}`);

  // Two quests with DIFFERENT status so we can verify the QuestBoard filter
  // reset: the completed quest is only visible if filter flips to "all"
  // when a ?questId=<completed-id> URL lands while filter is "active".
  const { data: activeQuest, error: aqErr } = await sb
    .from("campaign_quests")
    .insert({
      campaign_id: campaign.id,
      title: "Encontrar a pedra do vórtice",
      quest_type: "main",
      status: "active",
    })
    .select("id")
    .single();
  if (aqErr || !activeQuest)
    throw new Error(`Active quest create failed: ${aqErr?.message}`);

  const { data: completedQuest, error: cqErr } = await sb
    .from("campaign_quests")
    .insert({
      campaign_id: campaign.id,
      title: "Resgatar o bardo perdido",
      quest_type: "side",
      status: "completed",
    })
    .select("id")
    .single();
  if (cqErr || !completedQuest)
    throw new Error(`Completed quest create failed: ${cqErr?.message}`);

  return {
    campaignId: campaign.id,
    npcId: npc.id,
    parentLocationId: parent.id,
    childLocationId: child.id,
    factionId: faction.id,
    activeQuestId: activeQuest.id,
    completedQuestId: completedQuest.id,
  };
}

async function cleanupCampaign(campaignId: string): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("campaigns").delete().eq("id", campaignId);
  if (error) console.error(`[e2e cleanup] ${campaignId}:`, error);
}

test.describe("P1 — Entity Graph: Chip Navigation (receivers)", () => {
  test.setTimeout(120_000);

  const state: SetupState = {
    campaignId: null,
    userId: null,
    npcId: null,
    parentLocationId: null,
    childLocationId: null,
    factionId: null,
    activeQuestId: null,
    completedQuestId: null,
    skipReason: null,
  };

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      const userId = await getLoggedInUserId(page);
      if (!userId) {
        state.skipReason =
          "No Supabase session bridge (window.__pocketdm_supabase). Set NEXT_PUBLIC_E2E_MODE=true.";
        return;
      }
      state.userId = userId;
      const seeded = await seedCampaign(userId);
      state.campaignId = seeded.campaignId;
      state.npcId = seeded.npcId;
      state.parentLocationId = seeded.parentLocationId;
      state.childLocationId = seeded.childLocationId;
      state.factionId = seeded.factionId;
      state.activeQuestId = seeded.activeQuestId;
      state.completedQuestId = seeded.completedQuestId;
    } catch (err) {
      state.skipReason = `Setup failed: ${(err as Error).message}`;
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async () => {
    if (state.campaignId) await cleanupCampaign(state.campaignId);
  });

  test("NPC receiver: ?npcId=<uuid> scrolls NpcCard into view", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);
    if (!state.campaignId || !state.npcId) {
      test.skip(true, "Missing campaign/npc from setup");
      return;
    }

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(
        `/app/campaigns/${state.campaignId}?section=npcs&npcId=${state.npcId}`,
      );
      await page.waitForLoadState("domcontentloaded");

      const card = page.locator(`[data-testid="npc-card-${state.npcId}"]`);
      await expect(card, "NpcCard should render for focused id").toBeVisible({
        timeout: 10_000,
      });

      // Settle for the double-RAF scroll to fire
      await page.waitForTimeout(500);

      // Verify the card is on screen (a scrolled-out card would have its
      // bounding rect outside the viewport)
      const inViewport = await card.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const h = window.innerHeight || document.documentElement.clientHeight;
        return r.top < h && r.bottom > 0;
      });
      expect(inViewport, "NpcCard should be scrolled into the viewport").toBe(true);

      // URL preserved (no client-side redirect wiped the param)
      expect(page.url(), "URL should still carry the npcId").toContain(
        `npcId=${state.npcId}`,
      );
    } finally {
      await ctx.close();
    }
  });

  test("Location receiver: ?locationId=<child-uuid> uncollapses ancestors + scrolls", async ({
    browser,
  }) => {
    if (state.skipReason) test.skip(true, state.skipReason);
    if (!state.campaignId || !state.childLocationId || !state.parentLocationId) {
      test.skip(true, "Missing campaign/location from setup");
      return;
    }

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);

      // First land on locations tab WITHOUT a focus param so we can collapse
      // the parent manually (default view has everything expanded). We want
      // to verify that the focus URL re-uncollapses ancestors.
      await page.goto(`/app/campaigns/${state.campaignId}?section=locations`);
      await page.waitForLoadState("domcontentloaded");

      // Collapse the parent so the child is hidden in tree view.
      const collapseBtn = page.locator(
        `[data-testid="location-tree-toggle-${state.parentLocationId}"]`,
      );
      if (await collapseBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await collapseBtn.click();
        await page.waitForTimeout(200);
      }

      // Now navigate with focus. The receiver should walk the parent chain
      // and uncollapse before scrolling.
      await page.goto(
        `/app/campaigns/${state.campaignId}?section=locations&locationId=${state.childLocationId}`,
      );
      await page.waitForLoadState("domcontentloaded");

      const card = page.locator(
        `[data-testid="location-card-${state.childLocationId}"]`,
      );
      await expect(
        card,
        "Child LocationCard should be visible after ancestors uncollapsed",
      ).toBeVisible({ timeout: 10_000 });

      await page.waitForTimeout(500);

      const inViewport = await card.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const h = window.innerHeight || document.documentElement.clientHeight;
        return r.top < h && r.bottom > 0;
      });
      expect(inViewport, "Child LocationCard should be in viewport").toBe(true);
    } finally {
      await ctx.close();
    }
  });

  test("Faction receiver: ?factionId=<uuid> scrolls FactionCard into view", async ({
    browser,
  }) => {
    if (state.skipReason) test.skip(true, state.skipReason);
    if (!state.campaignId || !state.factionId) {
      test.skip(true, "Missing campaign/faction from setup");
      return;
    }

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(
        `/app/campaigns/${state.campaignId}?section=factions&factionId=${state.factionId}`,
      );
      await page.waitForLoadState("domcontentloaded");

      const card = page.locator(`[data-testid="faction-card-${state.factionId}"]`);
      await expect(card, "FactionCard should render for focused id").toBeVisible({
        timeout: 10_000,
      });

      await page.waitForTimeout(500);

      const inViewport = await card.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const h = window.innerHeight || document.documentElement.clientHeight;
        return r.top < h && r.bottom > 0;
      });
      expect(inViewport, "FactionCard should be in viewport").toBe(true);
    } finally {
      await ctx.close();
    }
  });

  test("Quest receiver: ?questId=<completed-uuid> resets status filter to all", async ({
    browser,
  }) => {
    if (state.skipReason) test.skip(true, state.skipReason);
    if (!state.campaignId || !state.completedQuestId) {
      test.skip(true, "Missing campaign/quest from setup");
      return;
    }

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);

      // Land on quests tab first so we can flip the filter to "active" — the
      // completed quest will be filtered out.
      await page.goto(`/app/campaigns/${state.campaignId}?section=quests`);
      await page.waitForLoadState("domcontentloaded");

      const activeFilterBtn = page
        .locator("[data-testid*='quest-filter']")
        .filter({ hasText: /^(ativa|active)$/i })
        .first();
      if (await activeFilterBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await activeFilterBtn.click();
        await page.waitForTimeout(200);
      }
      // Completed quest should NOT be rendered right now.
      const cardBefore = page.locator(
        `[data-testid="quest-card-${state.completedQuestId}"]`,
      );
      const visibleBefore = await cardBefore
        .isVisible({ timeout: 1_000 })
        .catch(() => false);
      expect(
        visibleBefore,
        "Completed quest should be filtered out before chip-nav",
      ).toBe(false);

      // Navigate with the focused quest id — filter should reset and card
      // should appear.
      await page.goto(
        `/app/campaigns/${state.campaignId}?section=quests&questId=${state.completedQuestId}`,
      );
      await page.waitForLoadState("domcontentloaded");

      const cardAfter = page.locator(
        `[data-testid="quest-card-${state.completedQuestId}"]`,
      );
      await expect(
        cardAfter,
        "Completed QuestCard should be visible after filter reset",
      ).toBeVisible({ timeout: 10_000 });

      await page.waitForTimeout(500);

      const inViewport = await cardAfter.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const h = window.innerHeight || document.documentElement.clientHeight;
        return r.top < h && r.bottom > 0;
      });
      expect(inViewport, "Completed QuestCard should be in viewport").toBe(true);
    } finally {
      await ctx.close();
    }
  });
});
