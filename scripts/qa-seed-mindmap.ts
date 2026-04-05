import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

async function checkAccount(email: string) {
  const { data } = await supabase.from('users').select('id').eq('email', email).single();
  return data?.id;
}

async function main() {
  const email = 'dm.primary@test-taverna.com';
  const dmId = await checkAccount(email);
  if (!dmId) {
    console.error("Account not found: " + email);
    process.exit(1);
  }

  // Create Campaign
  const { data: campaign, error: cErr } = await supabase.from('campaigns').insert({
    name: "Mind Map QA Campaign",
    description: "Automated test campaign for Mind Map testing",
    owner_id: dmId,
  }).select().single();
  
  if (cErr) {
    console.error("Campaign err:", cErr);
    process.exit(1);
  }
  
  const campaignId = campaign.id;
  console.log(`Created Campaign: ${campaignId}`);

  // Create 3 NPCs
  const npcs = [
    { campaign_id: campaignId, name: "Garn Normal", hp: 20, max_hp: 20, ac: 15, is_alive: true, is_visible_to_players: true, sort_order: 1 },
    { campaign_id: campaignId, name: "Thok Dead", hp: 0, max_hp: 20, ac: 10, is_alive: false, is_visible_to_players: true, sort_order: 2 },
    { campaign_id: campaignId, name: "Syl Hidden", hp: 15, max_hp: 15, ac: 12, is_alive: true, is_visible_to_players: false, sort_order: 3 },
  ];
  await supabase.from('campaign_npcs').insert(npcs);

  // Create 3 Notes
  const notes = [
    { campaign_id: campaignId, title: "General Note", content: "General content", note_type: "general" },
    { campaign_id: campaignId, title: "Ancient Lore", content: "Lore content", note_type: "lore" },
    { campaign_id: campaignId, title: "Dark Secret", content: "Secret content", note_type: "secret", shared_with_players: false },
  ];
  await supabase.from('campaign_notes').insert(notes);

  // Create 2 Sessions
  const { data: sessions } = await supabase.from('sessions').insert([
    { campaign_id: campaignId, title: "Active Session", is_active: true, user_id: dmId },
    { campaign_id: campaignId, title: "Closed Session", is_active: false, user_id: dmId },
  ]).select();

  // Create 3 Quests
  const quests = [
    { campaign_id: campaignId, title: "Available Quest", status: "available" },
    { campaign_id: campaignId, title: "Active Quest", status: "active" },
    { campaign_id: campaignId, title: "Completed Quest", status: "completed" },
  ];
  await supabase.from('campaign_quests').insert(quests);

  // Create 2 Bag Items
  const { data: bag } = await supabase.from('party_inventory').insert([
    { campaign_id: campaignId, name: "Magic Potion", quantity: 5, user_id: dmId },
    { campaign_id: campaignId, name: "Golden Chalice", quantity: 1, user_id: dmId },
  ]).select();

  // Create 2 Locations
  const { data: locations } = await supabase.from('campaign_locations').insert([
    { campaign_id: campaignId, name: "Capital City", location_type: "city", is_discovered: true },
    { campaign_id: campaignId, name: "Hidden Dungeon", location_type: "dungeon", is_discovered: false },
  ]).select();

  // Create 2 Factions
  const { data: factions } = await supabase.from('campaign_factions').insert([
    { campaign_id: campaignId, name: "The Emerald Guard", alignment: "ally", is_visible_to_players: true },
    { campaign_id: campaignId, name: "Shadow Syndicate", alignment: "hostile", is_visible_to_players: true },
  ]).select();
  
  if (factions && locations) {
    const edge = {
      campaign_id: campaignId,
      source_node: `faction:${factions[0].id}`,
      target_node: `location:${locations[0].id}`,
      relationship_type: "custom",
      relationship_label: "Protects",
    }
    await supabase.from('campaign_mind_map_edges').insert([edge]);
  }

  // Create Player Member
  const playerEmail = 'player.warrior@test-taverna.com';
  const playerId = await checkAccount(playerEmail);
  if (playerId) {
    await supabase.from('campaign_members').insert({
      campaign_id: campaignId,
      user_id: playerId,
      role: 'player',
      status: 'active'
    });
    await supabase.from('player_characters_extended').insert({
      campaign_id: campaignId,
      user_id: playerId,
      name: "Thorin The Tester",
      hp: 30,
      max_hp: 30,
      ac: 16
    });
  }

  console.log("Seeding complete. Campaign ID ready:", campaignId);
}
main().catch(console.error);
