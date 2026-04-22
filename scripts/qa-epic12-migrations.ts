import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Try a function that exists and returns version info (to prove service role works)
  const { data: stats, error: e1 } = await s.rpc("admin_combat_stats" as any);
  console.log("admin_combat_stats works?", e1 ? `ERR ${e1.message}` : `len=${Array.isArray(stats) ? stats.length : 'non-array'}`);

  // List supabase_migrations
  const { data: mig, error: e2 } = await s.schema("supabase_migrations" as any).from("schema_migrations").select("version,name").order("version", { ascending: false }).limit(10);
  console.log("last 10 migrations:", e2 ? `ERR ${e2.message}` : JSON.stringify(mig, null, 2));

  // Look specifically at 159 / 160
  if (!e2 && mig) {
    const m159 = mig.find((m: any) => m.version?.startsWith("159"));
    console.log("159 applied?", !!m159, m159);
  }
}
main().then(() => process.exit(0));
