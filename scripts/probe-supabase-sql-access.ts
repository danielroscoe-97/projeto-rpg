/**
 * Probe what SQL execution paths the service role key actually unlocks.
 * Trying common patterns — exec_sql RPC, query RPC, pgmeta endpoint, etc.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const s = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function tryRpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await s.rpc(name, args);
  return error
    ? `❌ rpc('${name}') → ${error.code ?? "?"}: ${error.message}`
    : `✅ rpc('${name}') → ${JSON.stringify(data).slice(0, 100)}`;
}

async function tryFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.text();
  return `${res.status} ${path} → ${body.slice(0, 200)}`;
}

async function main() {
  console.log(`Probing ${url}\n`);

  // Common RPC names that some Supabase projects create for SQL execution
  console.log("--- RPC probes ---");
  console.log(await tryRpc("exec_sql", { sql: "SELECT 1 AS x" }));
  console.log(await tryRpc("exec", { sql: "SELECT 1" }));
  console.log(await tryRpc("query", { sql: "SELECT 1" }));
  console.log(await tryRpc("run_sql", { sql: "SELECT 1" }));
  console.log(await tryRpc("execute_sql", { query: "SELECT 1" }));
  console.log(await tryRpc("pg_query", { query_text: "SELECT 1" }));

  // pgmeta / dashboard internal endpoints
  console.log("\n--- HTTP probes ---");
  console.log(await tryFetch("/pg/query", { method: "POST", body: JSON.stringify({ query: "SELECT 1" }) }));
  console.log(await tryFetch("/api/pg-meta/default/query", { method: "POST", body: JSON.stringify({ query: "SELECT 1" }) }));
  console.log(await tryFetch("/rest/v1/rpc/exec_sql", { method: "POST", body: JSON.stringify({ sql: "SELECT 1" }) }));

  // Read-only confirmation that PostgREST works
  console.log("\n--- Sanity (PostgREST table CRUD) ---");
  const { error: tableErr } = await s.from("player_characters").select("id").limit(1);
  console.log(tableErr ? `❌ table select → ${tableErr.message}` : "✅ table select works");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
