import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const dmEmail = "danielroscoe97@gmail.com";
const dmPassword = "Eusei123*";
const krynnId = "2f3e00a3-5c5c-42ae-a8f6-c2b67baa4564";

async function main() {
  // Step 1: sign in as DM to get an authenticated JWT (role=authenticated, sub=<dm_id>)
  // This EXACTLY simulates what the browser client does.
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: authData, error: authError } = await client.auth.signInWithPassword({ email: dmEmail, password: dmPassword });
  if (authError) { console.error("auth failed:", authError); process.exit(1); }
  const dmId = authData.user!.id;
  console.log(`✓ signed in as ${dmEmail} (id=${dmId})`);

  // Step 2: replicate handlePickCampaign's exact query
  const { data: sheets, error: selectError } = await client
    .from("player_characters")
    .select("*")
    .eq("campaign_id", krynnId)
    .order("created_at", { ascending: true });

  if (selectError) {
    console.error("SELECT failed:", selectError);
    process.exit(1);
  }

  console.log(`\n=== Authenticated DM sees ${sheets?.length ?? 0} Krynn PCs ===`);
  console.log(JSON.stringify(sheets?.map(s => ({ name: s.name, user_id: s.user_id })), null, 2));

  // Step 3: also query campaign_members as handlePickCampaign does
  const { data: memberRows, error: memErr } = await client
    .from("campaign_members")
    .select("user_id")
    .eq("campaign_id", krynnId)
    .eq("role", "player")
    .eq("status", "active");

  if (memErr) {
    console.error("members SELECT failed:", memErr);
  } else {
    console.log(`\n=== Authenticated DM sees ${memberRows?.length ?? 0} Krynn active players in campaign_members ===`);
    console.log(JSON.stringify(memberRows, null, 2));
  }
}

main().then(() => process.exit(0));
