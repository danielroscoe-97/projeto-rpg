import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sessionId = process.argv[2];
if (!sessionId) { console.error("need session id"); process.exit(1); }

async function main() {
  const tables = ["combatants", "encounter_combatants", "session_combatants", "combat_combatants", "encounter_participants"];
  for (const t of tables) {
    const { data, error, count } = await s.from(t as any).select("*", { count: "exact" }).eq("session_id", sessionId).limit(5);
    console.log(`${t}:`, error ? `ERR ${error.message}` : `count=${count}`, data?.slice(0, 2));
  }
  // also try encounters
  const { data: enc } = await s.from("encounters" as any).select("*").eq("session_id", sessionId).limit(5);
  console.log("encounters by session_id:", enc?.length, enc?.slice(0, 2));
}
main().then(() => process.exit(0));
