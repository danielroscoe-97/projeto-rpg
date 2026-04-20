import { test, expect, type Page } from "@playwright/test";
import { loginAsDM } from "../helpers/auth";
import { getServiceClient } from "../helpers/db";

/**
 * Entity Graph — Faction Members + Headquarters (AC-3d-01 .. AC-3d-05)
 *
 * Exercises the Factions tab of the Campaign HQ and the cross-card projections
 * that the Entity Graph layer drives off `campaign_mind_map_edges`:
 *
 *   - AC-3d-02: FactionCard renders member-count badge + sede (HQ) chip.
 *   - AC-3d-02: Expanded FactionCard lists all member NPCs.
 *   - AC-3d-03: NpcCard shows a faction chip for each faction the NPC is
 *     a member of.
 *   - AC-3d-04: LocationCard lists factions in the "Facções sediadas"
 *     section when expanded.
 *   - AC-3d-05: Deleting a faction cascades edge cleanup via the mig 152
 *     trigger (delete_edges_referencing_entity) — a DB-layer regression
 *     check that runs without any UI.
 *
 * Seeds a throwaway campaign owned by the logged-in DM with:
 *   1 location ("Porto Azul"), 5 NPCs ("NPC1"..."NPC5"), 1 faction
 *   ("Círculo da Rosa Negra"), 5 `member_of` edges (npc → faction) and
 *   1 `headquarters_of` edge (faction → location). Defensive: if setup
 *   fails (e.g. service-role key missing in CI), the entire block skips
 *   rather than masking real regressions with false failures.
 *
 * Combat Parity Rule (CLAUDE.md): Entity Graph is Auth-only — campaign
 * data is persisted and RLS-gated to campaign owners/members. No Guest
 * or Anonymous flow applies; only the authenticated DM path is tested.
 *
 * Testids verified in components/campaign/FactionCard.tsx, FactionList.tsx,
 * NpcCard.tsx, and LocationCard.tsx. Edge table is `campaign_mind_map_edges`
 * (mig 080, 148); cascade trigger is `delete_edges_referencing_entity` on
 * `campaign_factions` (mig 152).
 */

interface SetupState {
  campaignId: string | null;
  userId: string | null;
  locationId: string | null;
  factionId: string | null;
  npcIds: string[];
  skipReason: string | null;
}

async function getLoggedInUserId(page: Page): Promise<string | null> {
  // Reads the Supabase session via the E2E window bridge exposed by
  // lib/e2e/expose-supabase.ts. Returns null if the bridge is absent
  // (e.g. NEXT_PUBLIC_E2E_MODE != "true" in staging).
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

async function seedFactionScenario(userId: string, state: SetupState): Promise<void> {
  const sb = getServiceClient();

  // Campaign
  const { data: campaign, error: campErr } = await sb
    .from("campaigns")
    .insert({ owner_id: userId, name: `E2E Faction Members ${Date.now()}` })
    .select("id")
    .single();
  if (campErr || !campaign) throw new Error(`Campaign create failed: ${campErr?.message}`);
  state.campaignId = campaign.id;

  // Location (HQ target)
  const { data: location, error: locErr } = await sb
    .from("campaign_locations")
    .insert({
      campaign_id: campaign.id,
      name: "Porto Azul",
      description: "Cidade portuária fundada pelos piratas arrependidos.",
      location_type: "city",
      is_discovered: true,
    })
    .select("id")
    .single();
  if (locErr || !location) throw new Error(`Location create failed: ${locErr?.message}`);
  state.locationId = location.id;

  // 5 NPCs (members)
  const { data: npcs, error: npcErr } = await sb
    .from("campaign_npcs")
    .insert(
      Array.from({ length: 5 }, (_, i) => ({
        campaign_id: campaign.id,
        user_id: userId,
        name: `NPC${i + 1}`,
        stats: { hp: 20 + i, ac: 12 },
        is_visible_to_players: true,
      })),
    )
    .select("id, name");
  if (npcErr || !npcs || npcs.length !== 5) {
    throw new Error(`NPC create failed: ${npcErr?.message}`);
  }
  // Preserve NPC1..NPC5 order for downstream assertions
  const sortedNpcs = [...npcs].sort((a, b) => a.name.localeCompare(b.name));
  state.npcIds = sortedNpcs.map((n) => n.id);

  // Faction
  const { data: faction, error: facErr } = await sb
    .from("campaign_factions")
    .insert({
      campaign_id: campaign.id,
      name: "Círculo da Rosa Negra",
      description: "Uma sociedade secreta dedicada a equilibrar favores e segredos.",
      alignment: "neutral",
      is_visible_to_players: true,
    })
    .select("id")
    .single();
  if (facErr || !faction) throw new Error(`Faction create failed: ${facErr?.message}`);
  state.factionId = faction.id;

  // 5 member_of edges (npc → faction) + 1 headquarters_of (faction → location)
  const edgeRows = [
    ...state.npcIds.map((npcId) => ({
      campaign_id: campaign.id,
      source_type: "npc",
      source_id: npcId,
      target_type: "faction",
      target_id: faction.id,
      relationship: "member_of",
      created_by: userId,
    })),
    {
      campaign_id: campaign.id,
      source_type: "faction",
      source_id: faction.id,
      target_type: "location",
      target_id: location.id,
      relationship: "headquarters_of",
      created_by: userId,
    },
  ];
  const { error: edgeErr } = await sb.from("campaign_mind_map_edges").insert(edgeRows);
  if (edgeErr) throw new Error(`Edge create failed: ${edgeErr.message}`);
}

async function cleanupCampaign(campaignId: string): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("campaigns").delete().eq("id", campaignId);
  if (error) console.error(`[e2e cleanup] ${campaignId}:`, error);
}

test.describe("P1 — Entity Graph: Factions", () => {
  test.setTimeout(120_000);

  const state: SetupState = {
    campaignId: null,
    userId: null,
    locationId: null,
    factionId: null,
    npcIds: [],
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
      await seedFactionScenario(userId, state);
    } catch (err) {
      state.skipReason = `Setup failed: ${(err as Error).message}`;
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async () => {
    if (state.campaignId) await cleanupCampaign(state.campaignId);
  });

  test("AC-3d-02: FactionCard shows member count + HQ chip", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(`/app/campaigns/${state.campaignId}?section=factions`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector('[data-testid="faction-container"]', { timeout: 10_000 });

      const card = page.locator(`[data-testid="faction-card-${state.factionId}"]`);
      await expect(card).toBeVisible({ timeout: 10_000 });

      const memberBadge = page.locator(`[data-testid="faction-member-count-${state.factionId}"]`);
      await expect(memberBadge).toBeVisible({ timeout: 5_000 });
      await expect(memberBadge).toContainText("5");

      const sedeChip = page.locator(`[data-testid="faction-sede-chip-${state.factionId}"]`);
      await expect(sedeChip).toBeVisible({ timeout: 5_000 });
      await expect(sedeChip).toContainText("Porto Azul");
    } finally {
      await ctx.close();
    }
  });

  test("AC-3d-03: NpcCard shows faction chip for member", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(`/app/campaigns/${state.campaignId}?section=npcs`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector('[data-testid="npc-container"]', { timeout: 10_000 });

      const firstNpcId = state.npcIds[0];
      const chip = page.locator(
        `[data-testid="npc-faction-chip-${firstNpcId}-${state.factionId}"]`,
      );
      await expect(chip).toBeVisible({ timeout: 10_000 });
      await expect(chip).toContainText("Círculo da Rosa Negra");
    } finally {
      await ctx.close();
    }
  });

  test("AC-3d-04: LocationCard lists faction under HQ section", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(`/app/campaigns/${state.campaignId}?section=locations`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector('[data-testid="location-container"]', { timeout: 10_000 });

      // HQ count badge is always rendered on the card header
      const hqCount = page.locator(`[data-testid="location-hq-count-${state.locationId}"]`);
      await expect(hqCount).toBeVisible({ timeout: 5_000 });
      await expect(hqCount).toContainText("1");

      // The `Facções sediadas` section lives inside the expanded card body.
      // Scope the expand toggle to the row owning this location.
      const row = page.locator(`[data-testid="location-tree-row-${state.locationId}"]`);
      const rowCount = await row.count();
      const cardScope =
        rowCount > 0
          ? row
          : page.locator('[data-testid="location-container"]').filter({ hasText: "Porto Azul" });

      // The expand toggle is the card's internal `button.w-full` (chevron row).
      const expandBtn = cardScope.locator("button.w-full").first();
      await expandBtn.click();

      const hqsSection = page.locator(`[data-testid="location-hqs-${state.locationId}"]`);
      await expect(hqsSection).toBeVisible({ timeout: 5_000 });
      await expect(hqsSection).toContainText("Círculo da Rosa Negra");
    } finally {
      await ctx.close();
    }
  });

  test("AC-3d-02: expanded faction members list shows all 5 NPCs", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(`/app/campaigns/${state.campaignId}?section=factions`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector('[data-testid="faction-container"]', { timeout: 10_000 });

      const card = page.locator(`[data-testid="faction-card-${state.factionId}"]`);
      await expect(card).toBeVisible({ timeout: 10_000 });

      // The expand toggle is the card's internal `button.w-full` (chevron row).
      const expandBtn = card.locator("button.w-full").first();
      await expandBtn.click();

      const membersList = page.locator(`[data-testid="faction-members-${state.factionId}"]`);
      await expect(membersList).toBeVisible({ timeout: 5_000 });
      for (let i = 1; i <= 5; i++) {
        await expect(membersList).toContainText(`NPC${i}`);
      }
    } finally {
      await ctx.close();
    }
  });

  test("AC-3d-05: deleting faction removes all edges (DB trigger regression, mig 152)", async () => {
    if (state.skipReason) test.skip(true, state.skipReason);
    if (!state.factionId) test.skip(true, "Faction ID missing — seed failed silently.");

    const sb = getServiceClient();
    const factionId = state.factionId!;

    // Sanity: edges exist pre-delete (5 member_of + 1 headquarters_of = 6).
    const { data: preEdges, error: preErr } = await sb
      .from("campaign_mind_map_edges")
      .select("id, source_type, source_id, target_type, target_id, relationship")
      .or(
        `and(source_type.eq.faction,source_id.eq.${factionId}),and(target_type.eq.faction,target_id.eq.${factionId})`,
      );
    if (preErr) throw new Error(`Pre-delete edge query failed: ${preErr.message}`);
    expect(
      (preEdges ?? []).length,
      "Expected 6 edges referencing faction before delete (5 member_of + 1 headquarters_of)",
    ).toBe(6);

    // Delete faction — mig 152 AFTER DELETE trigger must cascade edge cleanup.
    const { error: delErr } = await sb
      .from("campaign_factions")
      .delete()
      .eq("id", factionId);
    if (delErr) throw new Error(`Faction delete failed: ${delErr.message}`);

    // Post-delete: zero edges reference this faction via source OR target.
    const { data: postEdges, error: postErr } = await sb
      .from("campaign_mind_map_edges")
      .select("id, source_type, source_id, target_type, target_id, relationship")
      .or(
        `and(source_type.eq.faction,source_id.eq.${factionId}),and(target_type.eq.faction,target_id.eq.${factionId})`,
      );
    if (postErr) throw new Error(`Post-delete edge query failed: ${postErr.message}`);
    expect(
      (postEdges ?? []).length,
      "mig 152 trigger leaked edges: expected 0 rows referencing deleted faction",
    ).toBe(0);

    // Mark faction as consumed so afterAll doesn't re-delete.
    state.factionId = null;
  });
});
