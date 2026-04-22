import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const krynnId = "2f3e00a3-5c5c-42ae-a8f6-c2b67baa4564";

async function main() {
  console.log("\n=== Krynn players ===\n");
  const { data: players } = await s
    .from("player_characters")
    .select("id,name,user_id,claimed_by_session_token,class,level")
    .eq("campaign_id", krynnId)
    .order("created_at", { ascending: true });
  console.log(JSON.stringify(players, null, 2));

  console.log("\n=== Krynn active sessions ===\n");
  const { data: sessions } = await s
    .from("sessions")
    .select("id,name,is_active,status,updated_at")
    .eq("campaign_id", krynnId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });
  console.log(JSON.stringify(sessions, null, 2));

  console.log("\n=== Krynn session tokens ===\n");
  const sessionIds = (sessions || []).map((s) => s.id);
  if (sessionIds.length > 0) {
    const { data: tokens, error } = await s
      .from("session_tokens")
      .select("token,session_id,player_name,anon_user_id,user_id,is_active,created_at")
      .in("session_id", sessionIds);
    console.log("error:", error);
    console.log("tokens:", JSON.stringify(tokens, null, 2));
  } else {
    console.log("no active sessions → no tokens to list");
  }
}

main().then(() => process.exit(0));
