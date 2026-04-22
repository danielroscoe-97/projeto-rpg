import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const dmEmail = "danielroscoe97@gmail.com";
const dmId = "0e489319-551d-4fde-ba04-5c44dea10886";
const krynnId = "2f3e00a3-5c5c-42ae-a8f6-c2b67baa4564";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

async function main() {
  // 1) Service role (bypasses RLS) — ground truth
  const svc = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: groundTruth } = await svc
    .from("player_characters")
    .select("id, name, user_id")
    .eq("campaign_id", krynnId);
  console.log(`\n=== Service role sees ${groundTruth?.length} Krynn PCs ===`);
  console.log(JSON.stringify(groundTruth?.map(p => ({ name: p.name, user_id: p.user_id })), null, 2));

  // 2) Simulate DM's authenticated query via a signed JWT
  // In browser, the authenticated DM calls via a JWT with role=authenticated + sub=<dmId>
  // Supabase service role can impersonate by setting a JWT header on postgrest directly
  console.log(`\n=== Attempting authenticated-role query (DM=${dmId}) via direct PostgREST ===`);

  // Using the anon key but with an impersonation JWT via a raw HTTP call:
  // Supabase supports "x-supabase-user-jwt" on its management API but not PostgREST directly.
  // Easier: use service role WITH a forced RLS check via explicit policy call.
  // Actually: easiest is to just SELECT with service role simulating what RLS would allow.
  // We can query the policies.
  const { data: policies, error } = await svc.rpc("pg_catalog_policies_for" as any, {}).select?.() ?? { data: null, error: { message: "no rpc" } };
  if (error) {
    console.log("(no RPC helper for policies — falling back to raw SQL via REST)");
  }

  // 3) Enumerate RLS policies on player_characters (via information_schema)
  const policiesUrl = `${url}/rest/v1/?select=policies`;
  console.log(`\n=== RLS policies on player_characters ===`);
  const { data: rlsPolicies } = await svc.from("pg_policies" as any)
    .select("*")
    .eq("tablename", "player_characters");
  if (rlsPolicies) {
    console.log(JSON.stringify(rlsPolicies, null, 2));
  } else {
    console.log("(pg_policies view not exposed — need to check via other means)");
  }

  // 4) Check campaign_members for DM's relationship to Krynn
  console.log(`\n=== DM's campaign_members row for Krynn ===`);
  const { data: member } = await svc
    .from("campaign_members")
    .select("*")
    .eq("campaign_id", krynnId)
    .eq("user_id", dmId);
  console.log(JSON.stringify(member, null, 2));

  // 5) Also check campaign.owner_id
  console.log(`\n=== Krynn campaign owner ===`);
  const { data: camp } = await svc
    .from("campaigns")
    .select("id, name, owner_id")
    .eq("id", krynnId);
  console.log(JSON.stringify(camp, null, 2));
}

main().then(() => process.exit(0));
