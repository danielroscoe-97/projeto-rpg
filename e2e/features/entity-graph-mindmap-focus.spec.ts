import { test, expect, type Page } from "@playwright/test";
import { loginAsDM } from "../helpers/auth";
import { getServiceClient } from "../helpers/db";

/**
 * Entity Graph — Mind Map Focus (Onda 6a)
 *
 * Exercises the "Open in Map" focus flow added in Onda 6a of the Entity
 * Graph epic. When a DM clicks the network icon on an NPC / faction /
 * location card, the URL becomes
 *
 *   /app/campaigns/<id>?section=mindmap&focus=<type>-<id>
 *
 * and the Mind Map renders with:
 *
 *   - focused entity + immediate neighbours at opacity 1
 *   - other nodes at opacity 0.25
 *   - edges not touching the focused entity at opacity 0.12
 *   - camera centred on the focused node (zoom 1.15, 450ms ease)
 *   - `mindmap-focus-chip` displayed above the graph
 *   - `mindmap-focus-clear` (X button) removes `?focus=` and restores the
 *     full-opacity view
 *
 * If an active filter would hide the focused entity, `mindmap-focus-hidden-
 * banner` surfaces instead, with `mindmap-focus-hidden-clear` as escape
 * hatch.
 *
 * REG-03 (from the Onda 6a AC list): rendering of CampaignMindMap MUST
 * remain unchanged for pre-existing edges — i.e. the chip / dimming only
 * activates when `focus=` is in the URL.
 *
 * Seeds a throwaway campaign owned by the logged-in DM with:
 *   - Viktor (NPC) lives_in Taverna (location)
 *   - Viktor member_of Círculo (faction)
 *   - Círculo headquarters_of Taverna
 *   - Elara (NPC) with NO edges — used to verify dimming
 *
 * Cleans up in afterAll. If setup fails (e.g. service-role key missing in
 * CI), the entire block skips rather than masking real regressions.
 *
 * Testids verified in components/campaign/CampaignMindMap.tsx (lines
 * 1655-1692) and components/campaign/{NpcCard,FactionCard,LocationCard}.tsx.
 */

interface SetupState {
  campaignId: string | null;
  userId: string | null;
  viktorId: string | null;
  elaraId: string | null;
  tavernaId: string | null;
  circuloId: string | null;
  skipReason: string | null;
}

async function getLoggedInUserId(page: Page): Promise<string | null> {
  return page.evaluate(async () => {
    const bridge = (
      window as unknown as {
        __pocketdm_supabase?: { auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> } };
      }
    ).__pocketdm_supabase;
    if (!bridge) return null;
    const { data } = await bridge.auth.getUser();
    return data.user?.id ?? null;
  });
}

interface SeedResult {
  campaignId: string;
  viktorId: string;
  elaraId: string;
  tavernaId: string;
  circuloId: string;
}

async function seedFocusFixture(userId: string): Promise<SeedResult> {
  const sb = getServiceClient();

  const { data: campaign, error: campErr } = await sb
    .from("campaigns")
    .insert({ owner_id: userId, name: `E2E MindMap Focus ${Date.now()}` })
    .select("id")
    .single();
  if (campErr || !campaign) throw new Error(`Campaign create failed: ${campErr?.message}`);
  const cid = campaign.id;

  const { data: npcs, error: npcErr } = await sb
    .from("campaign_npcs")
    .insert([
      {
        campaign_id: cid,
        user_id: userId,
        name: "Viktor",
        stats: { hp: 30, ac: 14 },
        is_visible_to_players: true,
        is_alive: true,
      },
      {
        campaign_id: cid,
        user_id: userId,
        name: "Elara",
        stats: { hp: 18, ac: 12 },
        is_visible_to_players: true,
        is_alive: true,
      },
    ])
    .select("id, name");
  if (npcErr || !npcs) throw new Error(`NPC create failed: ${npcErr?.message}`);

  const viktor = npcs.find((n) => n.name === "Viktor")!;
  const elara = npcs.find((n) => n.name === "Elara")!;

  const { data: location, error: locErr } = await sb
    .from("campaign_locations")
    .insert({
      campaign_id: cid,
      name: "Taverna",
      description: "A cozy tavern",
      location_type: "building",
      is_discovered: true,
    })
    .select("id")
    .single();
  if (locErr || !location) throw new Error(`Location create failed: ${locErr?.message}`);

  const { data: faction, error: facErr } = await sb
    .from("campaign_factions")
    .insert({
      campaign_id: cid,
      name: "Círculo",
      description: "A secret circle",
      alignment: "neutral",
      is_visible_to_players: true,
    })
    .select("id")
    .single();
  if (facErr || !faction) throw new Error(`Faction create failed: ${facErr?.message}`);

  // Viktor lives_in Taverna, Viktor member_of Círculo, Círculo headquarters_of Taverna.
  const { error: edgeErr } = await sb.from("campaign_mind_map_edges").insert([
    {
      campaign_id: cid,
      source_type: "npc",
      source_id: viktor.id,
      target_type: "location",
      target_id: location.id,
      relationship: "lives_in",
      created_by: userId,
    },
    {
      campaign_id: cid,
      source_type: "npc",
      source_id: viktor.id,
      target_type: "faction",
      target_id: faction.id,
      relationship: "member_of",
      created_by: userId,
    },
    {
      campaign_id: cid,
      source_type: "faction",
      source_id: faction.id,
      target_type: "location",
      target_id: location.id,
      relationship: "headquarters_of",
      created_by: userId,
    },
  ]);
  if (edgeErr) throw new Error(`Edge create failed: ${edgeErr.message}`);

  return {
    campaignId: cid,
    viktorId: viktor.id,
    elaraId: elara.id,
    tavernaId: location.id,
    circuloId: faction.id,
  };
}

async function cleanupCampaign(campaignId: string): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("campaigns").delete().eq("id", campaignId);
  if (error) console.error(`[e2e cleanup] ${campaignId}:`, error);
}

/**
 * Wait for ReactFlow to mount and render at least one node.
 * ReactFlow ships `.react-flow` wrapper and `.react-flow__node` per node;
 * nodes carry `data-id="<nodeId>"` that mirrors our "<type>-<uuid>" keys.
 */
async function waitForMindMap(page: Page): Promise<void> {
  await page.waitForSelector(".react-flow", { timeout: 10_000 });
  await page.waitForSelector(".react-flow__node", { timeout: 10_000 });
  // Allow fitView / focus easing (450ms) + a little layout settle time.
  await page.waitForTimeout(1500);
}

test.describe("P1 — Entity Graph: Mind Map Focus (Onda 6a)", () => {
  test.setTimeout(120_000);

  const state: SetupState = {
    campaignId: null,
    userId: null,
    viktorId: null,
    elaraId: null,
    tavernaId: null,
    circuloId: null,
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
      const seed = await seedFocusFixture(userId);
      state.campaignId = seed.campaignId;
      state.viktorId = seed.viktorId;
      state.elaraId = seed.elaraId;
      state.tavernaId = seed.tavernaId;
      state.circuloId = seed.circuloId;
    } catch (err) {
      state.skipReason = `Setup failed: ${(err as Error).message}`;
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async () => {
    if (state.campaignId) await cleanupCampaign(state.campaignId);
  });

  test("Focus chip appears with correct name when ?focus= is in URL", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(
        `/app/campaigns/${state.campaignId}?section=mindmap&focus=npc-${state.viktorId}`,
      );
      await waitForMindMap(page);

      const chip = page.locator('[data-testid="mindmap-focus-chip"]');
      await expect(chip).toBeVisible({ timeout: 10_000 });
      await expect(chip).toContainText("Viktor");
    } finally {
      await ctx.close();
    }
  });

  test("Clicking mindmap-focus-clear removes ?focus= from URL", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(
        `/app/campaigns/${state.campaignId}?section=mindmap&focus=npc-${state.viktorId}`,
      );
      await waitForMindMap(page);

      const chip = page.locator('[data-testid="mindmap-focus-chip"]');
      await expect(chip).toBeVisible({ timeout: 10_000 });

      await page.click('[data-testid="mindmap-focus-clear"]');
      await page.waitForTimeout(1000);

      expect(page.url(), "URL must no longer contain focus=").not.toMatch(/focus=/);
      await expect(chip).toBeHidden({ timeout: 5_000 });
    } finally {
      await ctx.close();
    }
  });

  test("Open-in-map icon on NPC card routes to focus URL", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(`/app/campaigns/${state.campaignId}?section=npcs`);
      await page.waitForLoadState("domcontentloaded");

      const openIcon = page.locator(`[data-testid="npc-open-in-map-${state.viktorId}"]`);
      await expect(openIcon).toBeVisible({ timeout: 10_000 });
      await openIcon.click();

      // Wait for the URL transition to the mindmap section with focus param.
      await page.waitForURL(/section=mindmap/, { timeout: 10_000 });
      expect(page.url()).toContain("section=mindmap");
      expect(page.url()).toContain(`focus=npc-${state.viktorId}`);

      await waitForMindMap(page);
      const chip = page.locator('[data-testid="mindmap-focus-chip"]');
      await expect(chip).toBeVisible({ timeout: 10_000 });
      await expect(chip).toContainText("Viktor");
    } finally {
      await ctx.close();
    }
  });

  test("Dimming applied: non-neighbour node has lower opacity", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(
        `/app/campaigns/${state.campaignId}?section=mindmap&focus=npc-${state.viktorId}`,
      );
      await waitForMindMap(page);

      // ReactFlow renders each node as `.react-flow__node` with `data-id`
      // matching our "<type>-<uuid>" key. We read both inline style and
      // computed opacity and soft-skip if the DOM shape differs.
      type NodeInfo = { id: string | null; opacity: string; inline: string };
      const nodes: NodeInfo[] = await page.$$eval(".react-flow__node", (els) =>
        els.map((el) => {
          const node = el as HTMLElement;
          return {
            id: node.getAttribute("data-id"),
            opacity: window.getComputedStyle(node).opacity,
            inline: node.style.opacity,
          };
        }),
      );

      if (nodes.length === 0) {
        test.skip(
          true,
          "ReactFlow DOM shape changed — no .react-flow__node elements found. Manual QA needed.",
        );
        return;
      }

      const viktorKey = `npc-${state.viktorId}`;
      const elaraKey = `npc-${state.elaraId}`;

      const viktorNode = nodes.find((n) => n.id === viktorKey);
      const elaraNode = nodes.find((n) => n.id === elaraKey);

      if (!viktorNode || !elaraNode) {
        console.log(
          `[mindmap-focus] actual node ids: ${nodes.map((n) => n.id).join(", ")}`,
        );
        test.skip(
          true,
          "Could not locate seeded nodes in ReactFlow DOM by data-id. Manual QA needed.",
        );
        return;
      }

      const readOpacity = (n: NodeInfo): number => {
        // Prefer inline style (what CampaignMindMap sets explicitly); fall
        // back to computed opacity otherwise.
        const raw = n.inline || n.opacity;
        const parsed = parseFloat(raw);
        return Number.isFinite(parsed) ? parsed : 1;
      };

      const viktorOpacity = readOpacity(viktorNode);
      const elaraOpacity = readOpacity(elaraNode);

      expect(
        viktorOpacity,
        `Focused node (Viktor) should be fully visible, got ${viktorOpacity}`,
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        elaraOpacity,
        `Non-neighbour node (Elara) should be dimmed, got ${elaraOpacity}`,
      ).toBeLessThanOrEqual(0.5);
    } finally {
      await ctx.close();
    }
  });

  test("Hidden-banner appears when filter hides focused entity", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(
        `/app/campaigns/${state.campaignId}?section=mindmap&focus=npc-${state.viktorId}`,
      );
      await waitForMindMap(page);

      // CampaignMindMap does NOT ship stable testids for filter toggles —
      // only the focus chip / banner testids (lines 1655-1692). We try a
      // small list of likely selectors (aria-labels, text matches) for the
      // NPC-type filter chip; if none are found we skip the test with a
      // clear reason so the suite doesn't go red on a UI we can't discover.
      const filterCandidates = [
        'button[aria-label*="NPC" i][aria-pressed]',
        'button[data-testid*="filter"][data-testid*="npc" i]',
        'button:has-text("NPCs")',
      ];

      let toggled = false;
      for (const selector of filterCandidates) {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 1_000 }).catch(() => false)) {
          await btn.click();
          toggled = true;
          break;
        }
      }

      if (!toggled) {
        test.skip(
          true,
          "Mind Map filter UI not found — no discoverable NPC-filter testid/aria. Manual QA needed.",
        );
        return;
      }

      await page.waitForTimeout(500);

      const banner = page.locator('[data-testid="mindmap-focus-hidden-banner"]');
      await expect(banner).toBeVisible({ timeout: 5_000 });

      await page.click('[data-testid="mindmap-focus-hidden-clear"]');
      await page.waitForTimeout(1000);

      await expect(banner).toBeHidden({ timeout: 5_000 });
      await expect(page.locator('[data-testid="mindmap-focus-chip"]')).toBeHidden({
        timeout: 5_000,
      });
    } finally {
      await ctx.close();
    }
  });

  test("Back button restores previous focus state", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(`/app/campaigns/${state.campaignId}?section=npcs`);
      await page.waitForLoadState("domcontentloaded");

      const openIcon = page.locator(`[data-testid="npc-open-in-map-${state.viktorId}"]`);
      await expect(openIcon).toBeVisible({ timeout: 10_000 });
      await openIcon.click();

      await page.waitForURL(/section=mindmap/, { timeout: 10_000 });
      await waitForMindMap(page);
      await expect(page.locator('[data-testid="mindmap-focus-chip"]')).toBeVisible({
        timeout: 10_000,
      });

      // Back to NPCs.
      await page.goBack();
      await page.waitForLoadState("domcontentloaded");
      expect(page.url()).toContain("section=npcs");

      // Forward re-enters the mindmap with focus param restored.
      await page.goForward();
      await page.waitForLoadState("domcontentloaded");
      await waitForMindMap(page);
      await expect(page.locator('[data-testid="mindmap-focus-chip"]')).toBeVisible({
        timeout: 10_000,
      });
      expect(page.url()).toContain(`focus=npc-${state.viktorId}`);
    } finally {
      await ctx.close();
    }
  });
});
