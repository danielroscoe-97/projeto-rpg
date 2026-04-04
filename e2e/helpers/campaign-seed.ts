/**
 * Seed helper for campaign E2E tests.
 * Creates a full campaign with NPCs, notes, sessions, encounters,
 * quests, bag items, locations, factions, edges, and a player member.
 *
 * Uses the Supabase service-role client to bypass RLS.
 */

import { config } from "dotenv";
import { resolve } from "path";
import { getServiceClient } from "./db";

// Load .env.local so SUPABASE_SERVICE_ROLE_KEY is available in Playwright process
config({ path: resolve(__dirname, "../../.env.local") });

export interface CampaignSeedData {
  campaignId: string;
  campaignName: string;
  npcs: { normal: string; dead: string; hidden: string };
  notes: { general: string; lore: string; secret: string };
  sessions: { active: string; ended: string };
  encounters: { enc1: string };
  quests: { available: string; active: string; completed: string };
  bagItems: { item1: string; item2: string };
  locations: { discovered: string; undiscovered: string };
  factions: { ally: string; hostile: string };
  edgeId: string;
  playerMemberId: string;
  playerCharacterId: string;
}

export async function seedCampaignForMindMap(
  dmUuid: string,
  playerUuid: string
): Promise<CampaignSeedData> {
  const sb = getServiceClient();
  const campaignName = `E2E MindMap ${Date.now()}`;

  // ── Campaign ──
  const { data: campaign, error: campErr } = await sb
    .from("campaigns")
    .insert({ owner_id: dmUuid, name: campaignName })
    .select("id")
    .single();
  if (campErr || !campaign) throw new Error(`Campaign create failed: ${campErr?.message}`);
  const cid = campaign.id;

  // ── NPCs (3: normal, dead, hidden) ──
  const { data: npcs, error: npcErr } = await sb
    .from("campaign_npcs")
    .insert([
      {
        campaign_id: cid,
        user_id: dmUuid,
        name: "Guard Captain Aldric",
        stats: { hp: 45, ac: 16 },
        is_visible_to_players: true,
        is_alive: true,
      },
      {
        campaign_id: cid,
        user_id: dmUuid,
        name: "Fallen Necromancer Voss",
        stats: { hp: 0, ac: 12 },
        is_visible_to_players: true,
        is_alive: false,
      },
      {
        campaign_id: cid,
        user_id: dmUuid,
        name: "Shadow Informant",
        stats: { hp: 20, ac: 14 },
        is_visible_to_players: false,
        is_alive: true,
      },
    ])
    .select("id, name");
  if (npcErr || !npcs) throw new Error(`NPC create failed: ${npcErr?.message}`);

  const npcNormal = npcs.find((n) => n.name === "Guard Captain Aldric")!;
  const npcDead = npcs.find((n) => n.name === "Fallen Necromancer Voss")!;
  const npcHidden = npcs.find((n) => n.name === "Shadow Informant")!;

  // ── Notes (3: general, lore, secret) ──
  const { data: notes, error: noteErr } = await sb
    .from("campaign_notes")
    .insert([
      {
        campaign_id: cid,
        user_id: dmUuid,
        title: "Session Plans",
        content: "Plan for next session",
        note_type: "general",
        is_shared: true,
      },
      {
        campaign_id: cid,
        user_id: dmUuid,
        title: "Ancient Dragon Lore",
        content: "The dragons of old...",
        note_type: "lore",
        is_shared: true,
      },
      {
        campaign_id: cid,
        user_id: dmUuid,
        title: "BBEG True Identity",
        content: "The real villain is...",
        note_type: "secret",
        is_shared: false,
      },
    ])
    .select("id, title");
  if (noteErr || !notes) throw new Error(`Note create failed: ${noteErr?.message}`);

  const noteGeneral = notes.find((n) => n.title === "Session Plans")!;
  const noteLore = notes.find((n) => n.title === "Ancient Dragon Lore")!;
  const noteSecret = notes.find((n) => n.title === "BBEG True Identity")!;

  // ── Sessions (2: active, ended) ──
  const { data: sessions, error: sessErr } = await sb
    .from("sessions")
    .insert([
      {
        campaign_id: cid,
        owner_id: dmUuid,
        name: "Dragon's Lair Assault",
        is_active: true,
      },
      {
        campaign_id: cid,
        owner_id: dmUuid,
        name: "Goblin Ambush",
        is_active: false,
      },
    ])
    .select("id, name");
  if (sessErr || !sessions) throw new Error(`Session create failed: ${sessErr?.message}`);

  const sessActive = sessions.find((s) => s.name === "Dragon's Lair Assault")!;
  const sessEnded = sessions.find((s) => s.name === "Goblin Ambush")!;

  // ── Encounter (linked to active session) ──
  const { data: enc, error: encErr } = await sb
    .from("encounters")
    .insert({
      session_id: sessActive.id,
      name: "Cave Entrance Fight",
      is_active: false,
    })
    .select("id")
    .single();
  if (encErr || !enc) throw new Error(`Encounter create failed: ${encErr?.message}`);

  // ── Quests (3: available, active, completed) ──
  const { data: quests, error: questErr } = await sb
    .from("campaign_quests")
    .insert([
      {
        campaign_id: cid,
        title: "Find the Lost Sword",
        description: "A legendary sword awaits",
        status: "available",
      },
      {
        campaign_id: cid,
        title: "Rescue the Prisoners",
        description: "Prisoners in the dungeon",
        status: "active",
      },
      {
        campaign_id: cid,
        title: "Defeat the Goblin King",
        description: "The goblin king has fallen",
        status: "completed",
      },
    ])
    .select("id, title");
  if (questErr || !quests) throw new Error(`Quest create failed: ${questErr?.message}`);

  const questAvailable = quests.find((q) => q.title === "Find the Lost Sword")!;
  const questActive = quests.find((q) => q.title === "Rescue the Prisoners")!;
  const questCompleted = quests.find((q) => q.title === "Defeat the Goblin King")!;

  // ── Bag Items (2) ──
  const { data: bagItems, error: bagErr } = await sb
    .from("party_inventory_items")
    .insert([
      {
        campaign_id: cid,
        item_name: "Healing Potion",
        quantity: 3,
        added_by: dmUuid,
        status: "active",
      },
      {
        campaign_id: cid,
        item_name: "Rope (50 ft)",
        quantity: 1,
        added_by: dmUuid,
        status: "active",
      },
    ])
    .select("id, item_name");
  if (bagErr || !bagItems) throw new Error(`Bag item create failed: ${bagErr?.message}`);

  const bagItem1 = bagItems.find((b) => b.item_name === "Healing Potion")!;
  const bagItem2 = bagItems.find((b) => b.item_name === "Rope (50 ft)")!;

  // ── Locations (2: discovered, undiscovered) ──
  const { data: locations, error: locErr } = await sb
    .from("campaign_locations")
    .insert([
      {
        campaign_id: cid,
        name: "Eldoria City",
        description: "A bustling trade hub",
        location_type: "city",
        is_discovered: true,
      },
      {
        campaign_id: cid,
        name: "Shadow Caverns",
        description: "Dark tunnels below",
        location_type: "dungeon",
        is_discovered: false,
      },
    ])
    .select("id, name");
  if (locErr || !locations) throw new Error(`Location create failed: ${locErr?.message}`);

  const locDiscovered = locations.find((l) => l.name === "Eldoria City")!;
  const locUndiscovered = locations.find((l) => l.name === "Shadow Caverns")!;

  // ── Factions (2: ally, hostile) ──
  const { data: factions, error: facErr } = await sb
    .from("campaign_factions")
    .insert([
      {
        campaign_id: cid,
        name: "Order of the Silver Shield",
        description: "Protectors of the realm",
        alignment: "ally",
        is_visible_to_players: true,
      },
      {
        campaign_id: cid,
        name: "Cult of the Crimson Eye",
        description: "Servants of darkness",
        alignment: "hostile",
        is_visible_to_players: true,
      },
    ])
    .select("id, name");
  if (facErr || !factions) throw new Error(`Faction create failed: ${facErr?.message}`);

  const factionAlly = factions.find((f) => f.name === "Order of the Silver Shield")!;
  const factionHostile = factions.find((f) => f.name === "Cult of the Crimson Eye")!;

  // ── Mind Map Edge (NPC lives_in Location) ──
  const { data: edge, error: edgeErr } = await sb
    .from("campaign_mind_map_edges")
    .insert({
      campaign_id: cid,
      source_type: "npc",
      source_id: npcNormal.id,
      target_type: "location",
      target_id: locDiscovered.id,
      relationship: "lives_in",
      created_by: dmUuid,
    })
    .select("id")
    .single();
  if (edgeErr || !edge) throw new Error(`Edge create failed: ${edgeErr?.message}`);

  // ── Player Member + Character ──
  const { data: member, error: memErr } = await sb
    .from("campaign_members")
    .insert({
      campaign_id: cid,
      user_id: playerUuid,
      role: "player",
      status: "active",
    })
    .select("id")
    .single();
  if (memErr || !member) throw new Error(`Member create failed: ${memErr?.message}`);

  const { data: pc, error: pcErr } = await sb
    .from("player_characters")
    .insert({
      campaign_id: cid,
      user_id: playerUuid,
      name: "Thorin Oakenshield",
      max_hp: 55,
      current_hp: 55,
      ac: 18,
    })
    .select("id")
    .single();
  if (pcErr || !pc) throw new Error(`Player character create failed: ${pcErr?.message}`);

  return {
    campaignId: cid,
    campaignName,
    npcs: { normal: npcNormal.id, dead: npcDead.id, hidden: npcHidden.id },
    notes: { general: noteGeneral.id, lore: noteLore.id, secret: noteSecret.id },
    sessions: { active: sessActive.id, ended: sessEnded.id },
    encounters: { enc1: enc.id },
    quests: {
      available: questAvailable.id,
      active: questActive.id,
      completed: questCompleted.id,
    },
    bagItems: { item1: bagItem1.id, item2: bagItem2.id },
    locations: { discovered: locDiscovered.id, undiscovered: locUndiscovered.id },
    factions: { ally: factionAlly.id, hostile: factionHostile.id },
    edgeId: edge.id,
    playerMemberId: member.id,
    playerCharacterId: pc.id,
  };
}

/**
 * Cleanup: delete the seeded campaign (cascades to all child entities).
 */
export async function cleanupCampaignSeed(campaignId: string) {
  const sb = getServiceClient();
  const { error } = await sb.from("campaigns").delete().eq("id", campaignId);
  if (error) {
    console.error(`[e2e cleanup] Failed to delete campaign ${campaignId}:`, error);
  } else {
    console.log(`[e2e cleanup] Deleted campaign ${campaignId}`);
  }
}
