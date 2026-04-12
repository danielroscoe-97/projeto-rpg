/**
 * Quick seed: Create a player account with a character in a campaign
 * for Active Effects E2E testing.
 *
 * Run: npx tsx scripts/seed-active-effects-qa.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PLAYER_EMAIL = "qa.effects@test-pocketdm.com";
const PLAYER_PASSWORD = "TestQA_Effects!1";
const PLAYER_NAME = "QA Effects Player";

// Use Dani's DM account as the campaign owner
const DM_EMAIL = "danielroscoe97@gmail.com";

async function main() {
  console.log("=== Seeding Active Effects QA Account ===\n");

  // 1. Find DM's user ID
  const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const dmUser = allUsers?.find((u) => u.email === DM_EMAIL);
  if (!dmUser) {
    console.error("DM account not found:", DM_EMAIL);
    process.exit(1);
  }
  console.log(`DM: ${dmUser.id} (${DM_EMAIL})`);

  // 2. Find DM's first campaign
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("owner_id", dmUser.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (!campaigns || campaigns.length === 0) {
    console.error("No campaigns found for DM");
    process.exit(1);
  }
  const campaign = campaigns[0];
  console.log(`Campaign: ${campaign.name} (${campaign.id})`);

  // 3. Create or find player auth user
  let playerId: string;
  const existingPlayer = allUsers?.find((u) => u.email === PLAYER_EMAIL);
  if (existingPlayer) {
    playerId = existingPlayer.id;
    console.log(`Player exists: ${playerId}`);

    // Update password in case it changed
    await supabase.auth.admin.updateUserById(playerId, { password: PLAYER_PASSWORD });
  } else {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: PLAYER_EMAIL,
      password: PLAYER_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: PLAYER_NAME },
    });
    if (error) {
      console.error("Failed to create player:", error.message);
      process.exit(1);
    }
    playerId = newUser.user.id;
    console.log(`Player created: ${playerId}`);
  }

  // 4. Ensure public.users profile
  const { error: profileError } = await supabase
    .from("users")
    .upsert({
      id: playerId,
      email: PLAYER_EMAIL,
      display_name: PLAYER_NAME,
      preferred_language: "en",
    }, { onConflict: "id" });

  if (profileError) {
    console.error("Profile error:", profileError.message);
  } else {
    console.log("Profile OK");
  }

  // 5. Add as campaign member (player role)
  const { error: memberError } = await supabase
    .from("campaign_members")
    .upsert({
      campaign_id: campaign.id,
      user_id: playerId,
      role: "player",
      status: "active",
    }, { onConflict: "campaign_id,user_id" });

  if (memberError) {
    console.error("Member error:", memberError.message);
  } else {
    console.log("Campaign member OK");
  }

  // 6. Create player character
  const { data: existingChar } = await supabase
    .from("player_characters")
    .select("id")
    .eq("campaign_id", campaign.id)
    .eq("user_id", playerId)
    .limit(1)
    .maybeSingle();

  if (existingChar) {
    console.log(`Character exists: ${existingChar.id}`);
  } else {
    const { data: newChar, error: charError } = await supabase
      .from("player_characters")
      .insert({
        campaign_id: campaign.id,
        user_id: playerId,
        name: "QA Test Hero",
        race: "Human",
        class: "Cleric",
        level: 5,
        max_hp: 38,
        current_hp: 38,
        ac: 18,
        str: 14,
        dex: 10,
        con: 14,
        int_score: 12,
        wis: 18,
        cha_score: 13,
        spell_save_dc: 15,
        spell_slots: { "1": { max: 4, used: 0 }, "2": { max: 3, used: 0 }, "3": { max: 2, used: 0 } },
      })
      .select("id")
      .single();

    if (charError) {
      console.error("Character error:", charError.message);
    } else {
      console.log(`Character created: ${newChar?.id}`);
    }
  }

  console.log("\n=== Ready for QA ===");
  console.log(`Login: ${PLAYER_EMAIL} / ${PLAYER_PASSWORD}`);
  console.log(`Campaign: ${campaign.name}`);
  console.log(`Sheet: /app/campaigns/${campaign.id}/sheet`);
}

main().catch(console.error);
