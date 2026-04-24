// Manual dry-run of the identity-accumulation probe.
//
// Mirrors the daily Vercel Cron at /api/cron/probe-identity, but for local
// use during baseline analysis. Outputs current counts + the last 7 probe
// rows from error_logs so you can eyeball the growth curve before deciding
// on a Slack-alert threshold.
//
// Usage: node scripts/probe-identity-accumulation.mjs
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  console.log("=== Probe: identity accumulation ===\n");

  const t0 = Date.now();
  const { data: probe, error: probeErr } = await sb.rpc("probe_identity_accumulation");

  if (probeErr) {
    console.error("RPC failed:", probeErr);
    process.exit(1);
  }

  console.log(`Probed in ${Date.now() - t0}ms:`);
  console.log(JSON.stringify(probe, null, 2));

  console.log("\n=== Last 7 probe runs (from error_logs) ===\n");
  const { data: history, error: histErr } = await sb
    .from("error_logs")
    .select("created_at, metadata")
    .eq("component", "probe_identity_accumulation")
    .order("created_at", { ascending: false })
    .limit(7);

  if (histErr) {
    console.error("history query failed:", histErr);
    process.exit(1);
  }

  if (!history?.length) {
    console.log("(no prior runs — this was the first)");
    return;
  }

  console.log(
    ["probed_at", "anon_users", "tokens_total", "tokens_active", "stale_candidates"]
      .map((h) => h.padStart(20))
      .join("  ")
  );
  for (const row of history) {
    const m = row.metadata ?? {};
    console.log(
      [
        row.created_at,
        String(m.anon_user_count ?? "-"),
        String(m.session_tokens_total ?? "-"),
        String(m.session_tokens_active ?? "-"),
        String(m.session_tokens_stale_candidates ?? "-"),
      ]
        .map((v) => String(v).padStart(20))
        .join("  ")
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
