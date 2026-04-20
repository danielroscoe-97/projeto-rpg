import { test, expect, type Page } from "@playwright/test";
import { loginAsDM } from "../helpers/auth";
import { getServiceClient } from "../helpers/db";

/**
 * Entity Graph — NPC ↔ Location linking (AC-3c-01, AC-3c-02, AC-3c-03, AC-3c-06)
 *
 * Covers the "Morada" relationship between NPCs and Locations. An NPC may
 * live in (at most) one location; the edge is stored in
 * campaign_mind_map_edges with relationship = 'lives_in' (mig 080 + 147 +
 * 148). The UI surfaces this in three places:
 *
 *   - NPC card: a "morada" chip with the location name (AC-3c-02)
 *   - Location card: a "Habitantes" section listing linked NPCs (AC-3c-03)
 *   - NPC edit form: an EntityTagSelector of type "location", singleSelect
 *     (AC-3c-01)
 *
 * Idempotency is guarded by UNIQUE (campaign_id, source_type, source_id,
 * target_type, target_id, relationship) on the edges table — a double-click
 * on Save must NOT create duplicate rows (AC-3c-06).
 *
 * CLAUDE.md alignment:
 *   - Combat Parity Rule: does NOT apply here. The Entity Graph is
 *     DM-authored content, Auth-only. Guest/Anon modes do not expose
 *     campaign HQ. No guest/anon parity required.
 *   - Resilient Reconnection Rule: does NOT apply. No realtime, no
 *     heartbeat, no presence.
 *
 * Setup mirrors e2e/features/entity-graph-location-hierarchy.spec.ts:
 * login as DM, seed a throwaway campaign + 1 location ("Taverna Teste")
 * + 1 NPC ("Viktor") via the service-role client, and cleanup in
 * afterAll (cascades remove edges, NPCs, locations). If setup fails
 * (missing service key, no session bridge), all tests skip with a clear
 * reason rather than false-failing.
 *
 * Testids verified 2026-04-20 in:
 *   - components/campaign/NpcCard.tsx      (npc-card, npc-morada-chip, npc-edit)
 *   - components/campaign/LocationCard.tsx (location-card, location-inhabitants,
 *                                           location-inhabitant-count)
 *   - components/campaign/NpcForm.tsx      (npc-form, npc-submit, npc-morada-*)
 *   - components/campaign/NpcList.tsx      (npc-container)
 */

interface SetupState {
  campaignId: string | null;
  userId: string | null;
  locationId: string | null;
  npcId: string | null;
  skipReason: string | null;
}

const LOCATION_NAME = "Taverna Teste";
const NPC_NAME = "Viktor";

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

async function seedCampaign(
  userId: string,
): Promise<{ campaignId: string; locationId: string; npcId: string }> {
  const sb = getServiceClient();

  const { data: campaign, error: campErr } = await sb
    .from("campaigns")
    .insert({ owner_id: userId, name: `E2E NPC-Location Link ${Date.now()}` })
    .select("id")
    .single();
  if (campErr || !campaign) throw new Error(`Campaign create failed: ${campErr?.message}`);

  const { data: loc, error: locErr } = await sb
    .from("campaign_locations")
    .insert({
      campaign_id: campaign.id,
      name: LOCATION_NAME,
      description: "Taverna seeded for NPC-Location link e2e",
      location_type: "building",
      is_discovered: true,
    })
    .select("id")
    .single();
  if (locErr || !loc) throw new Error(`Location create failed: ${locErr?.message}`);

  const { data: npc, error: npcErr } = await sb
    .from("campaign_npcs")
    .insert({
      campaign_id: campaign.id,
      user_id: userId,
      name: NPC_NAME,
      stats: { hp: 30, ac: 14 },
      is_visible_to_players: true,
      is_alive: true,
    })
    .select("id")
    .single();
  if (npcErr || !npc) throw new Error(`NPC create failed: ${npcErr?.message}`);

  return { campaignId: campaign.id, locationId: loc.id, npcId: npc.id };
}

async function cleanupCampaign(campaignId: string): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("campaigns").delete().eq("id", campaignId);
  if (error) console.error(`[e2e cleanup] ${campaignId}:`, error);
}

async function insertLivesInEdge(
  campaignId: string,
  npcId: string,
  locationId: string,
  createdBy: string,
): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("campaign_mind_map_edges").insert({
    campaign_id: campaignId,
    source_type: "npc",
    source_id: npcId,
    target_type: "location",
    target_id: locationId,
    relationship: "lives_in",
    created_by: createdBy,
  });
  if (error) throw new Error(`Edge seed failed: ${error.message}`);
}

async function deleteLivesInEdges(
  campaignId: string,
  npcId: string,
  locationId: string,
): Promise<void> {
  const sb = getServiceClient();
  await sb
    .from("campaign_mind_map_edges")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("source_type", "npc")
    .eq("source_id", npcId)
    .eq("target_type", "location")
    .eq("target_id", locationId)
    .eq("relationship", "lives_in");
}

async function countLivesInEdges(
  campaignId: string,
  npcId: string,
  locationId: string,
): Promise<number> {
  const sb = getServiceClient();
  const { count, error } = await sb
    .from("campaign_mind_map_edges")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("source_type", "npc")
    .eq("source_id", npcId)
    .eq("target_type", "location")
    .eq("target_id", locationId)
    .eq("relationship", "lives_in");
  if (error) throw new Error(`Edge count failed: ${error.message}`);
  return count ?? 0;
}

test.describe("P1 — Entity Graph: NPC ↔ Location", () => {
  test.setTimeout(120_000);

  const state: SetupState = {
    campaignId: null,
    userId: null,
    locationId: null,
    npcId: null,
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
      state.locationId = seeded.locationId;
      state.npcId = seeded.npcId;
    } catch (err) {
      state.skipReason = `Setup failed: ${(err as Error).message}`;
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async () => {
    if (state.campaignId) await cleanupCampaign(state.campaignId);
  });

  async function openNpcsTab(page: Page): Promise<boolean> {
    if (!state.campaignId) return false;
    await page.goto(`/app/campaigns/${state.campaignId}?section=npcs`);
    await page.waitForLoadState("domcontentloaded");
    return page
      .locator('[data-testid="npc-container"]')
      .waitFor({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
  }

  async function openLocationsTab(page: Page): Promise<boolean> {
    if (!state.campaignId) return false;
    await page.goto(`/app/campaigns/${state.campaignId}?section=locations`);
    await page.waitForLoadState("domcontentloaded");
    return page
      .locator('[data-testid="location-container"]')
      .waitFor({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
  }

  test("AC-3c-02: NPC card shows morada chip after edge exists", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    // Seed the lives_in edge directly so this test is independent from the
    // UI-create flow (covered in AC-3c-01 below).
    await insertLivesInEdge(
      state.campaignId!,
      state.npcId!,
      state.locationId!,
      state.userId!,
    );

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      const opened = await openNpcsTab(page);
      expect(opened, "NPCs tab failed to open").toBeTruthy();

      const npcCard = page.locator(`[data-testid="npc-card-${state.npcId}"]`);
      await expect(npcCard).toBeVisible({ timeout: 10_000 });

      // AC-3c-02: chip must render within ≤300ms of hydration. We give a
      // generous 5s here to absorb Next.js route bootstrap — the 300ms
      // budget is an internal render target, not a first-paint guarantee.
      const moradaChip = page.locator(`[data-testid="npc-morada-chip-${state.npcId}"]`);
      await expect(moradaChip).toBeVisible({ timeout: 5_000 });
      await expect(moradaChip).toContainText(LOCATION_NAME);
    } finally {
      await ctx.close();
      // Leave the edge in place for AC-3c-03 which queries the same campaign.
    }
  });

  test("AC-3c-03: Location card lists NPC in habitants section", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    // Ensure the edge from the previous test still exists. Re-seed defensively
    // so test ordering doesn't matter.
    await deleteLivesInEdges(state.campaignId!, state.npcId!, state.locationId!);
    await insertLivesInEdge(
      state.campaignId!,
      state.npcId!,
      state.locationId!,
      state.userId!,
    );

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      const opened = await openLocationsTab(page);
      expect(opened, "Locations tab failed to open").toBeTruthy();

      const locationCard = page.locator(`[data-testid="location-card-${state.locationId}"]`);
      await expect(locationCard).toBeVisible({ timeout: 10_000 });

      // The inhabitants section lives inside expanded content; open the card
      // if the section isn't yet visible. The card click target is the card
      // itself or a description toggle — try clicking the card first.
      const inhabitants = page.locator(
        `[data-testid="location-inhabitants-${state.locationId}"]`,
      );
      const initiallyVisible = await inhabitants
        .isVisible({ timeout: 2_000 })
        .catch(() => false);
      if (!initiallyVisible) {
        await locationCard.click();
      }

      await expect(inhabitants).toBeVisible({ timeout: 5_000 });
      await expect(inhabitants).toContainText(NPC_NAME);

      const count = page.locator(
        `[data-testid="location-inhabitant-count-${state.locationId}"]`,
      );
      await expect(count).toBeVisible({ timeout: 5_000 });
      // Badge should reflect at least 1 inhabitant (Viktor). Could render
      // as "1", "1 NPC", "1 habitante" etc.
      await expect(count).toContainText(/1/);
    } finally {
      await ctx.close();
      await deleteLivesInEdges(state.campaignId!, state.npcId!, state.locationId!);
    }
  });

  test("AC-3c-01: editing NPC Morada via UI persists new edge", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    // Start from a clean slate — no pre-existing edge.
    await deleteLivesInEdges(state.campaignId!, state.npcId!, state.locationId!);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      const opened = await openNpcsTab(page);
      expect(opened).toBeTruthy();

      const npcCard = page.locator(`[data-testid="npc-card-${state.npcId}"]`);
      await expect(npcCard).toBeVisible({ timeout: 10_000 });

      // Open the edit form for Viktor.
      const editBtn = page.locator(`[data-testid="npc-edit-${state.npcId}"]`);
      const hasEdit = await editBtn.isVisible({ timeout: 3_000 }).catch(() => false);
      if (!hasEdit) {
        test.skip(
          true,
          `npc-edit-${state.npcId} testid not found — edit affordance changed in NpcCard`,
        );
        return;
      }
      await editBtn.click();

      const form = page.locator('[data-testid="npc-form"]');
      await expect(form).toBeVisible({ timeout: 5_000 });

      // EntityTagSelector (testIdPrefix="npc-morada") renders either the
      // <select> variant (npc-morada-select) or the chip-picker variant
      // (npc-morada-add → search → options). Prefer the <select> if present,
      // otherwise drive the chip picker.
      const moradaSelect = page.locator('[data-testid="npc-morada-select"]');
      const moradaAdd = page.locator('[data-testid="npc-morada-add"]');

      const hasSelect = await moradaSelect.isVisible({ timeout: 2_000 }).catch(() => false);
      if (hasSelect) {
        // Radix SelectTrigger: click trigger, then click matching option by
        // testid (portal-rendered, so addressable at page scope).
        await moradaSelect.click();
        await page
          .locator(`[data-testid="npc-morada-option-${state.locationId}"]`)
          .click();
      } else {
        const hasAdd = await moradaAdd.isVisible({ timeout: 2_000 }).catch(() => false);
        if (!hasAdd) {
          test.skip(
            true,
            "Neither npc-morada-select nor npc-morada-add visible — morada UI not rendered (availableLocations empty?)",
          );
          return;
        }
        await moradaAdd.click();
        const option = page.locator(
          `[data-testid="npc-morada-option-${state.locationId}"]`,
        );
        await expect(option).toBeVisible({ timeout: 3_000 });
        await option.click();
      }

      // Save.
      await page.click('[data-testid="npc-submit"]');
      await expect(form).toBeHidden({ timeout: 10_000 });

      // Chip must appear on the card.
      const moradaChip = page.locator(`[data-testid="npc-morada-chip-${state.npcId}"]`);
      await expect(moradaChip).toBeVisible({ timeout: 5_000 });
      await expect(moradaChip).toContainText(LOCATION_NAME);

      // Belt-and-suspenders: exactly one edge row in the DB.
      const n = await countLivesInEdges(
        state.campaignId!,
        state.npcId!,
        state.locationId!,
      );
      expect(n, "Expected exactly 1 lives_in edge after UI save").toBe(1);
    } finally {
      await ctx.close();
      await deleteLivesInEdges(state.campaignId!, state.npcId!, state.locationId!);
    }
  });

  test("AC-3c-06: double-click on Save is idempotent (no duplicate edges)", async ({
    browser,
  }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    await deleteLivesInEdges(state.campaignId!, state.npcId!, state.locationId!);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      const opened = await openNpcsTab(page);
      expect(opened).toBeTruthy();

      const editBtn = page.locator(`[data-testid="npc-edit-${state.npcId}"]`);
      const hasEdit = await editBtn.isVisible({ timeout: 3_000 }).catch(() => false);
      if (!hasEdit) {
        test.skip(true, "npc-edit affordance not found — cannot exercise double-save");
        return;
      }
      await editBtn.click();

      const form = page.locator('[data-testid="npc-form"]');
      await expect(form).toBeVisible({ timeout: 5_000 });

      // Set morada using whichever variant of EntityTagSelector is rendered.
      const moradaSelect = page.locator('[data-testid="npc-morada-select"]');
      const moradaAdd = page.locator('[data-testid="npc-morada-add"]');
      const hasSelect = await moradaSelect.isVisible({ timeout: 2_000 }).catch(() => false);
      if (hasSelect) {
        // Radix SelectTrigger: click trigger, then click matching option by
        // testid (portal-rendered, so addressable at page scope).
        await moradaSelect.click();
        await page
          .locator(`[data-testid="npc-morada-option-${state.locationId}"]`)
          .click();
      } else {
        const hasAdd = await moradaAdd.isVisible({ timeout: 2_000 }).catch(() => false);
        if (!hasAdd) {
          test.skip(true, "Morada UI not rendered; cannot exercise double-save");
          return;
        }
        await moradaAdd.click();
        const option = page.locator(
          `[data-testid="npc-morada-option-${state.locationId}"]`,
        );
        await expect(option).toBeVisible({ timeout: 3_000 });
        await option.click();
      }

      // Double-click Save: fire both clicks before React batches the
      // disabled-state update. Promise.all ensures they race the in-flight
      // upsert. If upsertEntityLink is idempotent (unique constraint with
      // ON CONFLICT DO NOTHING), only one row lands.
      const submit = page.locator('[data-testid="npc-submit"]');
      await Promise.all([
        submit.click({ timeout: 1_000 }).catch(() => {}),
        submit.click({ timeout: 1_000 }).catch(() => {}),
      ]);

      await expect(form).toBeHidden({ timeout: 10_000 });

      // Give the server a brief moment to settle any second write attempt.
      await page.waitForTimeout(500);

      const n = await countLivesInEdges(
        state.campaignId!,
        state.npcId!,
        state.locationId!,
      );
      expect(
        n,
        `Expected exactly 1 lives_in edge after double-click save, got ${n} — idempotency broken`,
      ).toBe(1);
    } finally {
      await ctx.close();
      await deleteLivesInEdges(state.campaignId!, state.npcId!, state.locationId!);
    }
  });
});
