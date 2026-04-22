import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const krynnId = "2f3e00a3-5c5c-42ae-a8f6-c2b67baa4564";

async function main() {
  const mode = process.argv[2];

  if (mode === "list") {
    const { data } = await s
      .from("sessions")
      .select("id,name,updated_at,is_active,is_draft")
      .eq("campaign_id", krynnId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(10);
    console.log("active sessions in Krynn:", JSON.stringify(data, null, 2));
    return;
  }

  const sessionId = process.argv[3];
  if (!sessionId) { console.error("usage: age-session.ts age5h|age2h|reset <session-id>"); process.exit(1); }

  // Use qa_backdate_session RPC (migration 178) to bypass the
  // trg_sessions_updated_at trigger that would otherwise overwrite the value.
  // Requires `p_caller_user_id` to match session owner.
  const dmId = "0e489319-551d-4fde-ba04-5c44dea10886"; // danielroscoe97@gmail.com

  let ageHours: number;
  if (mode === "age5h") ageHours = 5;
  else if (mode === "age2h") ageHours = 2;
  else if (mode === "reset") ageHours = 0;
  else { console.error("invalid mode"); process.exit(1); }

  const { data, error } = await s.rpc("qa_backdate_session" as any, {
    p_session_id: sessionId,
    p_age_hours: ageHours,
    p_caller_user_id: dmId,
  });

  if (error) {
    // Fallback for environments where migration 178 isn't applied yet:
    // plain UPDATE (will be overwritten by trigger but kept for diagnosis).
    console.log("RPC failed, error:", error.message);
    console.log("Hint: migration 178_qa_backdate_session.sql must be applied to prod.");
    process.exit(1);
  }

  console.log(`✓ Session ${sessionId} updated_at set to ${data} (age=${ageHours}h)`);
}
main().then(() => process.exit(0));
