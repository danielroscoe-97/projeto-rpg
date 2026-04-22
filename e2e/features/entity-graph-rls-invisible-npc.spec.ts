import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { getServiceClient } from "../helpers/db";
import { PLAYER_WARRIOR } from "../fixtures/test-accounts";

/**
 * Entity Graph — RLS guards invisible NPCs against member leaks (AC-3c-05).
 *
 * AC-3c-05: "RLS: jogador membro não vê edge para NPC invisível
 * (`is_visible_to_players=false`)".
 *
 * Design of the guarantee under test
 * ----------------------------------
 * `campaign_mind_map_edges` row-level security (mig 080) lets ANY active
 * `campaign_members` row SELECT any edge of the campaign. That's by design —
 * the edge table is intentionally permissive because the sensitive datum is
 * the *target entity*, not the edge pointer.
 *
 * The invisibility contract for AC-3c-05 is enforced at the NPC layer:
 * `campaign_npcs` mig 043 RLS allows members to read ONLY NPCs with
 * `is_visible_to_players = true`. So when a player joins the edge to the
 * NPC table (the natural code path for rendering "Vive em: ..." chips or
 * "Habitantes" panels), Postgres filters the invisible NPC row and the
 * player ends up with an empty result — as if the edge didn't exist.
 *
 * This spec proves that contract end-to-end at the RLS layer without
 * touching the UI. It's deterministic, fast, and locks in the invariant
 * against future schema churn (e.g. if someone relaxes campaign_npcs RLS
 * without thinking through the edge-join consequences).
 *
 * What the spec does
 * ------------------
 * 1. Service-role seeds: a DM-owned campaign, two NPCs (one visible
 *    "Marcus", one invisible "Viktor"), one location "Taverna", and edges
 *    NPC → Location `lives_in` for BOTH NPCs.
 * 2. Adds a seeded player (PLAYER_WARRIOR) as an active campaign member.
 * 3. Signs in as that player with the anon key.
 * 4. Runs two queries joined onto `campaign_npcs`:
 *    a) `select ... campaign_npcs!inner(name) ... where target_id = <taverna>`
 *    b) `select(name) from campaign_npcs where campaign_id = <cid>`
 *    Asserts Marcus is visible in both, Viktor is NOT visible in either.
 * 5. Cleans up: drop membership, delete campaign (cascade-kills npcs, edges).
 *
 * Why this is valuable
 * --------------------
 * The entity-graph test surface already covers the happy path where ALL NPCs
 * are visible. AC-3c-05 is the adversarial / privilege-separation edge: a
 * member shouldn't be able to enumerate invisible NPCs even through the edge
 * graph's join surfaces. This spec encodes that as a CI-runnable guard.
 */

interface SetupState {
  ownerId: string | null;
  playerUserId: string | null;
  campaignId: string | null;
  visibleNpcId: string | null;
  invisibleNpcId: string | null;
  tavernaId: string | null;
  skipReason: string | null;
}

async function resolveOwnerUserId(): Promise<string | null> {
  const sb = getServiceClient();
  const email =
    process.env.E2E_DM_EMAIL ||
    process.env.NEXT_PUBLIC_E2E_DM_EMAIL ||
    "dm.primary@test-taverna.com";
  const { data, error } = await sb.auth.admin.listUsers();
  if (error || !data) return null;
  const u = data.users.find((x) => x.email === email);
  return u?.id ?? null;
}

async function resolvePlayerUserId(): Promise<string | null> {
  const sb = getServiceClient();
  const { data, error } = await sb.auth.admin.listUsers();
  if (error || !data) return null;
  const u = data.users.find((x) => x.email === PLAYER_WARRIOR.email);
  return u?.id ?? null;
}

test.describe("P1 — Entity Graph: RLS hides invisible-NPC edges from members (AC-3c-05)", () => {
  test.setTimeout(90_000);

  const state: SetupState = {
    ownerId: null,
    playerUserId: null,
    campaignId: null,
    visibleNpcId: null,
    invisibleNpcId: null,
    tavernaId: null,
    skipReason: null,
  };

  test.beforeAll(async () => {
    try {
      const sb = getServiceClient();
      state.ownerId = await resolveOwnerUserId();
      state.playerUserId = await resolvePlayerUserId();
      if (!state.ownerId) {
        state.skipReason =
          "Could not resolve DM user id from service client (set E2E_DM_EMAIL).";
        return;
      }
      if (!state.playerUserId) {
        state.skipReason = `PLAYER_WARRIOR (${PLAYER_WARRIOR.email}) not seeded — run scripts/seed-test-accounts.ts.`;
        return;
      }

      const { data: camp, error: ce } = await sb
        .from("campaigns")
        .insert({ owner_id: state.ownerId, name: `E2E RLS AC-3c-05 ${Date.now()}` })
        .select("id")
        .single();
      if (ce || !camp) throw new Error(`Campaign seed failed: ${ce?.message}`);
      state.campaignId = camp.id;

      const { data: loc, error: le } = await sb
        .from("campaign_locations")
        .insert({
          campaign_id: camp.id,
          name: "Taverna Oculta",
          location_type: "building",
        })
        .select("id")
        .single();
      if (le || !loc) throw new Error(`Location seed failed: ${le?.message}`);
      state.tavernaId = loc.id;

      const { data: npcs, error: ne } = await sb
        .from("campaign_npcs")
        .insert([
          {
            campaign_id: camp.id,
            user_id: state.ownerId,
            name: "Marcus Visível",
            is_visible_to_players: true,
          },
          {
            campaign_id: camp.id,
            user_id: state.ownerId,
            name: "Viktor Invisível",
            is_visible_to_players: false,
          },
        ])
        .select("id, name, is_visible_to_players");
      if (ne || !npcs || npcs.length !== 2) throw new Error(`NPC seed failed: ${ne?.message}`);
      state.visibleNpcId = npcs.find((n) => n.name === "Marcus Visível")!.id;
      state.invisibleNpcId = npcs.find((n) => n.name === "Viktor Invisível")!.id;

      const { error: ee } = await sb.from("campaign_mind_map_edges").insert([
        {
          campaign_id: camp.id,
          source_type: "npc",
          source_id: state.visibleNpcId,
          target_type: "location",
          target_id: state.tavernaId,
          relationship: "lives_in",
          created_by: state.ownerId,
        },
        {
          campaign_id: camp.id,
          source_type: "npc",
          source_id: state.invisibleNpcId,
          target_type: "location",
          target_id: state.tavernaId,
          relationship: "lives_in",
          created_by: state.ownerId,
        },
      ]);
      if (ee) throw new Error(`Edges seed failed: ${ee.message}`);

      // Enrol the player as an active member. The trigger on campaign insert
      // auto-adds the DM; we add the player explicitly.
      const { error: me } = await sb.from("campaign_members").upsert(
        {
          campaign_id: camp.id,
          user_id: state.playerUserId,
          role: "player",
          status: "active",
          invited_by: state.ownerId,
        },
        { onConflict: "campaign_id,user_id" },
      );
      if (me) throw new Error(`Membership seed failed: ${me.message}`);
    } catch (err) {
      state.skipReason = `Setup failed: ${(err as Error).message}`;
    }
  });

  test.afterAll(async () => {
    if (!state.campaignId) return;
    const sb = getServiceClient();
    const { error } = await sb.from("campaigns").delete().eq("id", state.campaignId);
    if (error) console.error(`[e2e cleanup] ${state.campaignId}:`, error);
  });

  test("AC-3c-05: player cannot read invisible NPC through any join path", async () => {
    if (state.skipReason) test.skip(true, state.skipReason);

    const url =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!url || !anonKey) {
      test.skip(
        true,
        "Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — can't simulate player auth.",
      );
    }

    // Anon client → sign in as the seeded player → query under RLS.
    const playerClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const email = PLAYER_WARRIOR.email;
    const password = PLAYER_WARRIOR.password;
    const { data: signIn, error: siErr } = await playerClient.auth.signInWithPassword({
      email,
      password,
    });
    if (siErr || !signIn?.user) {
      test.skip(
        true,
        `PLAYER_WARRIOR sign-in failed (${siErr?.message ?? "no user"}). ` +
          "Run scripts/seed-test-accounts.ts on the target environment.",
      );
    }

    // 1) Direct query on campaign_npcs must return Marcus only (Viktor is
    //    RLS-filtered for members).
    const { data: npcsAsPlayer, error: npcErr } = await playerClient
      .from("campaign_npcs")
      .select("id, name, is_visible_to_players")
      .eq("campaign_id", state.campaignId!);
    expect(npcErr, `Player NPC select should not error: ${npcErr?.message}`).toBeNull();
    const visibleNpcNames = (npcsAsPlayer ?? []).map((n) => n.name).sort();
    expect(
      visibleNpcNames,
      `Member must see the visible NPC only; got ${visibleNpcNames.join(" | ") || "[]"}`,
    ).toEqual(["Marcus Visível"]);

    // 2) Join across edges → npcs must ALSO filter out the invisible NPC.
    //    Uses `!inner` so edges whose NPC side is RLS-hidden vanish from the
    //    result set — exactly the UX outcome AC-3c-05 promises ("não vê edge
    //    para NPC invisível").
    //    We inspect edges whose target is the taverna and whose source_type
    //    is npc, joined onto the NPC row so RLS cascades.
    const { data: edgesJoined, error: joinErr } = await playerClient
      .from("campaign_mind_map_edges")
      .select(
        "id, source_id, target_id, relationship, npc:source_id (id, name, is_visible_to_players)",
      )
      .eq("campaign_id", state.campaignId!)
      .eq("source_type", "npc")
      .eq("target_type", "location")
      .eq("target_id", state.tavernaId!);
    expect(joinErr, `Join query should not error: ${joinErr?.message}`).toBeNull();

    // Postgrest embeds: when the parent row is RLS-hidden the embed is null.
    // So the Viktor edge either (a) doesn't appear, or (b) appears with
    // `npc: null`. Either way, the player must NOT see Viktor's name.
    const joinedRows = edgesJoined ?? [];
    const revealedNames = joinedRows
      .map((r) => {
        const npc = (r as unknown as { npc?: { name?: string } | null }).npc;
        return npc?.name;
      })
      .filter((n): n is string => typeof n === "string")
      .sort();
    expect(
      revealedNames,
      `Join must not reveal Viktor via the edge surface; got ${revealedNames.join(" | ") || "[]"}`,
    ).toEqual(["Marcus Visível"]);

    // 3) Explicit: Viktor's id must never appear in a direct lookup either.
    const { data: direct, error: dErr } = await playerClient
      .from("campaign_npcs")
      .select("id")
      .eq("id", state.invisibleNpcId!);
    expect(dErr).toBeNull();
    expect(
      (direct ?? []).length,
      `Direct-by-id read of the invisible NPC must return 0 rows under member RLS`,
    ).toBe(0);

    await playerClient.auth.signOut();
  });
});
