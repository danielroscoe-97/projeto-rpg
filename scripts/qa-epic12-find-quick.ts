import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ownerId = "0e489319-551d-4fde-ba04-5c44dea10886";

async function main() {
  const { data: sessions } = await s
    .from("sessions")
    .select("id,name,campaign_id,status,is_draft,is_active,created_at,updated_at")
    .eq("owner_id", ownerId)
    .is("campaign_id", null)
    .order("updated_at", { ascending: false })
    .limit(20);

  console.log("Quick sessions (campaign_id=null):", sessions?.length);
  for (const sess of (sessions || []).slice(0, 10)) {
    const { data: enc } = await s.from("encounters" as any).select("id,name,status").eq("session_id", sess.id);
    console.log(`  ${sess.id} | name=${sess.name} | status=${sess.status} | is_draft=${sess.is_draft} | is_active=${sess.is_active} | encounters=${enc?.length || 0}`, enc?.[0]);
  }
}
main().then(() => process.exit(0));
