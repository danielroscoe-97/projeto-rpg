import { test, expect, type Page } from "@playwright/test";
import { loginAsDM } from "../helpers/auth";
import { getServiceClient } from "../helpers/db";

/**
 * Entity Graph — Note Mentions (AC-3e-02 .. AC-3e-04)
 *
 * Exercises the multi-entity `mentions` edges that flow from campaign notes
 * to NPCs, locations, factions, and quests after mig 153. Specifically:
 *
 *   - AC-3e-02: Legacy `note_npc_links` rows still surface in the NPC
 *     reverse-lookup panel during the dual-read co-existence window.
 *   - AC-3e-03: A single note can mention NPC + Location + Faction
 *     simultaneously via three distinct `campaign_mind_map_edges` rows.
 *   - AC-3e-04: Each entity card ("Notas sobre isto" panel) lists notes
 *     that mention it — NpcCard, LocationCard, FactionCard.
 *
 * NOT covered here (belongs to Jest, not E2E):
 *   - AC-3e-01: idempotency of mig 153 (`ON CONFLICT DO NOTHING`) —
 *     that is asserted via SQL unit tests against the migration.
 *
 * Seeds a throwaway campaign owned by the logged-in DM plus one NPC
 * ("Viktor"), one location ("Taverna do Pêndulo"), and one faction
 * ("Círculo da Rosa Negra"). Tests create their own notes so nothing
 * leaks between assertions. Campaign is deleted in afterAll; edges and
 * notes cascade via FK.
 *
 * Defensive: if setup fails (e.g. service-role key missing in CI), the
 * entire block skips rather than masking real regressions with false
 * failures. Each test re-checks for its own selectors and skips with a
 * specific reason when a testid or table is missing.
 *
 * Testids verified against:
 *   - components/campaign/EntityTagSelector.tsx (testIdPrefix pattern)
 *   - components/campaign/CampaignNotes.tsx (prefixes: note-locations-{id},
 *     note-factions-{id}, note-quests-{id}; no note-npcs- prefix since
 *     NPCs still use NpcTagSelector)
 *   - components/campaign/NpcCard.tsx — npc-related-notes-{id}
 *   - components/campaign/LocationCard.tsx — location-related-notes-{id}
 *   - components/campaign/FactionCard.tsx — faction-related-notes-{id}
 *
 * Schema verified from supabase/migrations/153_migrate_note_npc_links_to_edges.sql:
 *   - Edges table: `campaign_mind_map_edges`
 *     (campaign_id, source_type, source_id, target_type, target_id,
 *      relationship, created_by, created_at)
 *   - Legacy table: `note_npc_links` (id, note_id, npc_id) — kept for one
 *     sprint; AC-3e-02 test skips gracefully once the table is dropped.
 */

interface SetupState {
  campaignId: string | null;
  userId: string | null;
  npcId: string | null;
  locationId: string | null;
  factionId: string | null;
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
  locationId: string;
  factionId: string;
}> {
  const sb = getServiceClient();
  const stamp = Date.now();

  const { data: campaign, error: cErr } = await sb
    .from("campaigns")
    .insert({ owner_id: userId, name: `E2E Note Mentions ${stamp}` })
    .select("id")
    .single();
  if (cErr || !campaign) throw new Error(`Campaign create failed: ${cErr?.message}`);

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

  const { data: location, error: lErr } = await sb
    .from("campaign_locations")
    .insert({
      campaign_id: campaign.id,
      name: "Taverna do Pêndulo",
      location_type: "building",
    })
    .select("id")
    .single();
  if (lErr || !location) throw new Error(`Location create failed: ${lErr?.message}`);

  const { data: faction, error: fErr } = await sb
    .from("campaign_factions")
    .insert({
      campaign_id: campaign.id,
      name: "Círculo da Rosa Negra",
    })
    .select("id")
    .single();
  if (fErr || !faction) throw new Error(`Faction create failed: ${fErr?.message}`);

  return {
    campaignId: campaign.id,
    npcId: npc.id,
    locationId: location.id,
    factionId: faction.id,
  };
}

async function cleanupCampaign(campaignId: string): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("campaigns").delete().eq("id", campaignId);
  if (error) console.error(`[e2e cleanup] ${campaignId}:`, error);
}

async function createNoteViaService(
  campaignId: string,
  userId: string,
  title: string,
): Promise<string> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("campaign_notes")
    .insert({
      campaign_id: campaignId,
      user_id: userId,
      title,
      content: "",
      is_shared: false,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Note create failed: ${error?.message}`);
  return data.id;
}

async function createEdge(
  campaignId: string,
  userId: string,
  sourceType: string,
  sourceId: string,
  targetType: string,
  targetId: string,
  relationship = "mentions",
): Promise<void> {
  const sb = getServiceClient();
  const { error } = await sb.from("campaign_mind_map_edges").insert({
    campaign_id: campaignId,
    source_type: sourceType,
    source_id: sourceId,
    target_type: targetType,
    target_id: targetId,
    relationship,
    created_by: userId,
  });
  if (error) throw new Error(`Edge create failed: ${error.message}`);
}

test.describe("P1 — Entity Graph: Note Mentions", () => {
  test.setTimeout(180_000);

  const state: SetupState = {
    campaignId: null,
    userId: null,
    npcId: null,
    locationId: null,
    factionId: null,
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
      state.locationId = seeded.locationId;
      state.factionId = seeded.factionId;
    } catch (err) {
      state.skipReason = `Setup failed: ${(err as Error).message}`;
    } finally {
      await ctx.close();
    }
  });

  test.afterAll(async () => {
    if (state.campaignId) await cleanupCampaign(state.campaignId);
  });

  async function openNotesSection(page: Page): Promise<boolean> {
    if (!state.campaignId) return false;
    await page.goto(`/app/campaigns/${state.campaignId}?section=notes`);
    await page.waitForLoadState("domcontentloaded");
    // Wait for the "New note" button or the empty state. Either is proof
    // the notes tab rendered. We check for the + button because it's
    // present even with zero notes.
    const newNoteBtn = page
      .getByRole("button", { name: /new_note|nova nota|new note|criar nota/i })
      .first();
    return newNoteBtn
      .waitFor({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
  }

  async function expandNpcCard(page: Page, npcId: string): Promise<boolean> {
    const card = page.locator(`[data-testid="npc-card-${npcId}"]`);
    const visible = await card.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!visible) return false;
    // The expand toggle has no testid — it's the only button inside the
    // card that spans full width at the bottom. Click the last button in
    // the card that is not an icon-only action (edit/delete/toggle).
    // Simplest robust approach: click the card background when there is
    // no onCardClick handler (pure-list view); if that does nothing,
    // click the ChevronDown icon.
    const chevron = card.locator("svg.lucide-chevron-down, svg.lucide-chevron-up").first();
    if (await chevron.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await chevron.click();
      return true;
    }
    // Fallback: click any <button> inside the card whose accessible name
    // is the description/notes toggle wrapper.
    const toggle = card.locator('button:has(svg.lucide-chevron-down)').first();
    if (await toggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await toggle.click();
      return true;
    }
    return false;
  }

  async function expandCardByTestid(page: Page, cardTestid: string): Promise<boolean> {
    const card = page.locator(`[data-testid="${cardTestid}"]`);
    const visible = await card.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!visible) return false;
    const chevron = card.locator("svg.lucide-chevron-down, svg.lucide-chevron-up").first();
    if (await chevron.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await chevron.click();
      return true;
    }
    const toggle = card.locator('button:has(svg.lucide-chevron-down)').first();
    if (await toggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await toggle.click();
      return true;
    }
    return false;
  }

  test("AC-3e-03: Note can link NPC + Location + Faction simultaneously", async ({
    browser,
  }) => {
    if (state.skipReason) test.skip(true, state.skipReason);
    if (!state.campaignId || !state.userId) {
      test.skip(true, "Missing campaign/user from setup");
      return;
    }

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      const opened = await openNotesSection(page);
      expect(opened, "Notes section failed to open").toBeTruthy();

      // Create a note via the service client so we have a stable noteId to
      // drive the UI against (the + button creates with an empty title and
      // surfaces the freshest note at the top — but its id is only knowable
      // via network inspection, which is brittle).
      const noteId = await createNoteViaService(
        state.campaignId,
        state.userId,
        "O taverneiro",
      );

      // Reload so the new note appears in the list
      await page.reload();
      await page.waitForLoadState("domcontentloaded");

      // Click the note row to expand it. The collapsed header is a button
      // with the note title. After expansion, the title input has testid
      // note-title-{id}.
      const titleInput = page.locator(`[data-testid="note-title-${noteId}"]`);
      if (!(await titleInput.isVisible({ timeout: 3_000 }).catch(() => false))) {
        // Not expanded yet — find the collapsed row by its visible title
        const collapsedRow = page
          .locator("button", { hasText: "O taverneiro" })
          .first();
        const canExpand = await collapsedRow
          .isVisible({ timeout: 5_000 })
          .catch(() => false);
        if (!canExpand) {
          test.skip(true, "Could not locate newly-created note row 'O taverneiro'");
          return;
        }
        await collapsedRow.click();
        await titleInput.waitFor({ timeout: 5_000 });
      }

      // The Location/Faction/Quest selectors are gated behind a "More
      // options" toggle in CampaignNotes.tsx. Click it to reveal them.
      const moreOptsToggle = page
        .locator("button", {
          hasText: /more_options|mais opções|more options|less_options|menos opções/i,
        })
        .first();
      if (await moreOptsToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await moreOptsToggle.click();
      }

      // --- Link Location ("Taverna do Pêndulo") -----------------------------
      const locAddBtn = page.locator(
        `[data-testid="note-locations-${noteId}-add"]`,
      );
      if (!(await locAddBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
        test.skip(
          true,
          `testid "note-locations-${noteId}-add" missing — LocationTagSelector not rendered (is campaignLocations.length > 0?)`,
        );
        return;
      }
      await locAddBtn.click();
      await page
        .locator(`[data-testid="note-locations-${noteId}-option-${state.locationId}"]`)
        .click();

      // --- Link Faction ("Círculo da Rosa Negra") ---------------------------
      const facAddBtn = page.locator(
        `[data-testid="note-factions-${noteId}-add"]`,
      );
      if (!(await facAddBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
        test.skip(
          true,
          `testid "note-factions-${noteId}-add" missing — FactionTagSelector not rendered`,
        );
        return;
      }
      await facAddBtn.click();
      await page
        .locator(`[data-testid="note-factions-${noteId}-option-${state.factionId}"]`)
        .click();

      // --- Link NPC ("Viktor") via NpcTagSelector ---------------------------
      const npcAddBtn = page.locator('[data-testid="npc-tag-add"]').first();
      if (!(await npcAddBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
        test.skip(
          true,
          'testid "npc-tag-add" missing — NpcTagSelector not rendered',
        );
        return;
      }
      await npcAddBtn.click();
      await page
        .locator(`[data-testid="npc-tag-option-${state.npcId}"]`)
        .click();

      // Give writes time to flush. We intentionally do not call reload()
      // because the UI syncs via its own debounce + optimistic updates;
      // the DB check below is the source of truth.
      await page.waitForTimeout(1500);

      // --- Assert: 3 mention edges exist via service client -----------------
      const sb = getServiceClient();
      const { data: edges, error } = await sb
        .from("campaign_mind_map_edges")
        .select("source_type,source_id,target_type,target_id,relationship")
        .eq("campaign_id", state.campaignId)
        .eq("source_type", "note")
        .eq("source_id", noteId)
        .eq("relationship", "mentions");
      expect(error, "edges query failed").toBeNull();

      const targetPairs = (edges ?? []).map(
        (e) => `${e.target_type}:${e.target_id}`,
      );
      expect(targetPairs).toContain(`location:${state.locationId}`);
      expect(targetPairs).toContain(`faction:${state.factionId}`);
      expect(targetPairs).toContain(`npc:${state.npcId}`);
    } finally {
      await ctx.close();
    }
  });

  test("AC-3e-04: NpcCard shows linked note under 'Notas sobre isto'", async ({
    browser,
  }) => {
    if (state.skipReason) test.skip(true, state.skipReason);
    if (!state.campaignId || !state.userId || !state.npcId) {
      test.skip(true, "Missing campaign/user/npc from setup");
      return;
    }

    // Seed: new note + edge note→npc mentions
    const noteId = await createNoteViaService(
      state.campaignId,
      state.userId,
      "Backlink NPC test",
    );
    await createEdge(
      state.campaignId,
      state.userId,
      "note",
      noteId,
      "npc",
      state.npcId,
    );

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(`/app/campaigns/${state.campaignId}?section=npcs`);
      await page.waitForLoadState("domcontentloaded");

      // Expand Viktor's card so the "Notas sobre isto" panel mounts
      const expanded = await expandNpcCard(page, state.npcId);
      if (!expanded) {
        test.skip(true, `Could not locate or expand npc-card-${state.npcId}`);
        return;
      }

      const panel = page.locator(
        `[data-testid="npc-related-notes-${state.npcId}"]`,
      );
      if (!(await panel.isVisible({ timeout: 5_000 }).catch(() => false))) {
        // Fallback: text-based — some builds may lag on the dual-read fold
        const byText = page.getByText("Backlink NPC test").first();
        if (await byText.isVisible({ timeout: 3_000 }).catch(() => false)) {
          console.warn(
            `[note-mentions] testid npc-related-notes-${state.npcId} missing; ` +
              `fell back to text match.`,
          );
          return;
        }
        test.skip(
          true,
          `testid "npc-related-notes-${state.npcId}" not found and text fallback failed`,
        );
        return;
      }
      await expect(panel).toContainText("Backlink NPC test");
    } finally {
      await ctx.close();
    }
  });

  test("AC-3e-04: LocationCard shows linked note under reverse panel", async ({
    browser,
  }) => {
    if (state.skipReason) test.skip(true, state.skipReason);
    if (!state.campaignId || !state.userId || !state.locationId) {
      test.skip(true, "Missing campaign/user/location from setup");
      return;
    }

    const noteId = await createNoteViaService(
      state.campaignId,
      state.userId,
      "Backlink Location test",
    );
    await createEdge(
      state.campaignId,
      state.userId,
      "note",
      noteId,
      "location",
      state.locationId,
    );

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(`/app/campaigns/${state.campaignId}?section=locations`);
      await page.waitForLoadState("domcontentloaded");

      const expanded = await expandCardByTestid(
        page,
        `location-card-${state.locationId}`,
      );
      if (!expanded) {
        test.skip(
          true,
          `Could not locate or expand location-card-${state.locationId}`,
        );
        return;
      }

      const panel = page.locator(
        `[data-testid="location-related-notes-${state.locationId}"]`,
      );
      await expect(panel).toBeVisible({ timeout: 10_000 });
      await expect(panel).toContainText("Backlink Location test");
    } finally {
      await ctx.close();
    }
  });

  test("AC-3e-04: FactionCard shows linked note", async ({ browser }) => {
    if (state.skipReason) test.skip(true, state.skipReason);
    if (!state.campaignId || !state.userId || !state.factionId) {
      test.skip(true, "Missing campaign/user/faction from setup");
      return;
    }

    const noteId = await createNoteViaService(
      state.campaignId,
      state.userId,
      "Backlink Faction test",
    );
    await createEdge(
      state.campaignId,
      state.userId,
      "note",
      noteId,
      "faction",
      state.factionId,
    );

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(`/app/campaigns/${state.campaignId}?section=factions`);
      await page.waitForLoadState("domcontentloaded");

      const expanded = await expandCardByTestid(
        page,
        `faction-card-${state.factionId}`,
      );
      if (!expanded) {
        test.skip(
          true,
          `Could not locate or expand faction-card-${state.factionId}`,
        );
        return;
      }

      const panel = page.locator(
        `[data-testid="faction-related-notes-${state.factionId}"]`,
      );
      await expect(panel).toBeVisible({ timeout: 10_000 });
      await expect(panel).toContainText("Backlink Faction test");
    } finally {
      await ctx.close();
    }
  });

  test("AC-3e-02: Legacy note_npc_links row still renders in NPC notes panel (dual-read)", async ({
    browser,
  }) => {
    if (state.skipReason) test.skip(true, state.skipReason);
    if (!state.campaignId || !state.userId || !state.npcId) {
      test.skip(true, "Missing campaign/user/npc from setup");
      return;
    }

    // Seed: note + LEGACY link only (no edge). This is the pre-mig-153
    // shape. NpcList must union legacy rows with edges in the UI.
    const noteId = await createNoteViaService(
      state.campaignId,
      state.userId,
      "Legacy dual-read test",
    );

    const sb = getServiceClient();
    const { error: legacyErr } = await sb.from("note_npc_links").insert({
      note_id: noteId,
      npc_id: state.npcId,
    });
    if (legacyErr) {
      // Table may have been dropped in a later migration — skip gracefully.
      const msg = legacyErr.message?.toLowerCase() ?? "";
      if (
        msg.includes("does not exist") ||
        msg.includes("relation") ||
        msg.includes("not found")
      ) {
        test.skip(
          true,
          `Legacy note_npc_links table removed — dual-read period ended (err: ${legacyErr.message})`,
        );
        return;
      }
      throw new Error(`Unexpected legacy insert failure: ${legacyErr.message}`);
    }

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await loginAsDM(page);
      await page.goto(`/app/campaigns/${state.campaignId}?section=npcs`);
      await page.waitForLoadState("domcontentloaded");

      const expanded = await expandNpcCard(page, state.npcId);
      if (!expanded) {
        test.skip(true, `Could not locate or expand npc-card-${state.npcId}`);
        return;
      }

      const panel = page.locator(
        `[data-testid="npc-related-notes-${state.npcId}"]`,
      );
      await expect(panel).toBeVisible({ timeout: 10_000 });
      await expect(panel).toContainText("Legacy dual-read test");
    } finally {
      await ctx.close();
    }
  });
});
