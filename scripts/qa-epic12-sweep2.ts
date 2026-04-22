import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Attempt raw POST to PostgREST rpc endpoint directly
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // without params
  let res = await fetch(`${url}/rest/v1/rpc/sweep_abandoned_combat_drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: "{}",
  });
  console.log("POST {} →", res.status, await res.text());

  // with older_than
  res = await fetch(`${url}/rest/v1/rpc/sweep_abandoned_combat_drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ older_than: "1 second" }),
  });
  console.log("POST {older_than:'1 second'} →", res.status, await res.text());

  // check any known working function to rule out 401 issues
  res = await fetch(`${url}/rest/v1/rpc/admin_combat_stats`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: "{}",
  });
  console.log("admin_combat_stats →", res.status, (await res.text()).slice(0, 200));

  // verify admin_anon_cleanup (random function that should exist?)
  const list = await fetch(`${url}/rest/v1/rpc/`, {
    method: "GET",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  console.log("rpc root list status:", list.status);
}
main().then(() => process.exit(0));
