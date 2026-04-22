import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sessionId = process.argv[2];
if (!sessionId) {
  console.error("Usage: tsx qa-epic12-probe.ts <session-uuid>");
  process.exit(1);
}

async function main() {
  const { data: sess, error: e1 } = await s.from("sessions").select("*").eq("id", sessionId).maybeSingle();
  console.log("session:", e1 ? `ERROR ${e1.message}` : JSON.stringify(sess, null, 2));

  if (sess) {
    const { data: encounters } = await s.from("encounters" as any).select("id,session_id,name,status").eq("session_id", sessionId);
    console.log("encounters:", JSON.stringify(encounters, null, 2));
    if (encounters?.length) {
      for (const e of encounters) {
        const { data: combatants } = await s.from("combatants").select("id,name,type,hp_max,hp_current").eq("encounter_id", (e as any).id);
        console.log(`combatants for encounter ${(e as any).id}:`, JSON.stringify(combatants, null, 2));
      }
    }
  }
}

main().then(() => process.exit(0));
