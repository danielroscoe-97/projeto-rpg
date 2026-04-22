import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const s = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function tryRpc(name: string, body: any = {}) {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { name, status: res.status, bodySnippet: text.slice(0, 220) };
}

async function queryColumn(table: string, col: string) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${col}&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const text = await res.text();
  return { table, col, status: res.status, body: text.slice(0, 120) };
}

async function main() {
  console.log("\n=== Migration presence probe (prod) ===\n");

  // Migration 159: sweep_abandoned_combat_drafts()
  console.log("159:", await tryRpc("sweep_abandoned_combat_drafts", { older_than: "1 second" }));

  // Migration 160: sessions.is_draft column
  console.log("160:", await queryColumn("sessions", "is_draft"));

  // Migration 165: v_player_sessions_played matview (via a safe select)
  console.log("165:", await queryColumn("my_sessions_played", "count"));

  // Migration 166: user_onboarding.dm_tour_* columns + users.share_past_companions
  console.log("166a (user_onboarding.dm_tour_completed):", await queryColumn("user_onboarding", "dm_tour_completed,dm_tour_step,first_campaign_created_at"));
  console.log("166b (users.share_past_companions):", await queryColumn("users", "share_past_companions"));

  // Migration 167: srd_monster_slugs table
  console.log("167:", await queryColumn("srd_monster_slugs", "slug"));

  // Migration 169: past_companions RPC (real signature: p_limit, p_offset — uses auth.uid() internally)
  // Service role has no auth.uid(), so the function errors out with a 401-ish code but that proves it exists.
  console.log("169:", await tryRpc("get_past_companions", { p_limit: 1, p_offset: 0 }));

  // Migration 170: clone_campaign_from_template RPC (real signature: p_template_id, p_new_dm_user_id)
  console.log("170:", await tryRpc("clone_campaign_from_template", { p_template_id: "00000000-0000-0000-0000-000000000000", p_new_dm_user_id: "00000000-0000-0000-0000-000000000000" }));

  // Migration 179: qa_backdate_session RPC — QA helper
  console.log("179:", await tryRpc("qa_backdate_session", { p_session_id: "00000000-0000-0000-0000-000000000000", p_age_hours: 1, p_caller_user_id: "00000000-0000-0000-0000-000000000000" }));

  // Migration 173: audit_template_srd_drift RPC
  console.log("173:", await tryRpc("audit_template_srd_drift", {}));

  // Migration 174: encounters.sort_order column
  console.log("174:", await queryColumn("encounters", "sort_order"));
}
main().then(() => process.exit(0));
