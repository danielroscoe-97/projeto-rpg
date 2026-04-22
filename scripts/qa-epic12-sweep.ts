import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("--- Calling sweep_abandoned_combat_drafts() ---");
  const { data, error } = await s.rpc("sweep_abandoned_combat_drafts" as any);
  console.log("result:", JSON.stringify({ data, error }, null, 2));

  console.log("\n--- Calling sweep_abandoned_combat_drafts(interval '1 second') ---");
  const { data: d2, error: e2 } = await s.rpc("sweep_abandoned_combat_drafts" as any, { older_than: "1 second" });
  console.log("first call:", JSON.stringify({ data: d2, error: e2 }, null, 2));

  const { data: d3, error: e3 } = await s.rpc("sweep_abandoned_combat_drafts" as any, { older_than: "1 second" });
  console.log("second call:", JSON.stringify({ data: d3, error: e3 }, null, 2));

  console.log("\n--- Recent error_logs from sweeper ---");
  const { data: logs } = await s
    .from("error_logs" as any)
    .select("*")
    .eq("component", "sweep_abandoned_combat_drafts")
    .order("created_at", { ascending: false })
    .limit(10);
  console.log("logs:", JSON.stringify(logs, null, 2));
}
main().then(() => process.exit(0));
