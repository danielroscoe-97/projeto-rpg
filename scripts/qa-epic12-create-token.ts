import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { randomBytes } from "crypto";
dotenv.config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * QA-only helper: create a fresh active session_token for the Krynn active session.
 * Mirrors lib/supabase/campaign-membership.ts generateSessionToken pattern (hex-ish).
 */
function generateToken(): string {
  // 32 chars of hex-compatible alphanumeric (matches what the app uses)
  return randomBytes(16).toString("hex");
}

async function main() {
  const sessionId = "c57a0926-93d1-4988-bbb3-d80f609d995a"; // Krynn active session
  const token = generateToken();

  // Need an anon_user_id — generate a fake one for QA. The real flow creates it
  // when the player visits /join/<token> and signInAnonymously runs.
  // For this QA, we'll leave it null initially and let the player claim flow fill it in.
  const { data, error } = await s
    .from("session_tokens")
    .insert({
      session_id: sessionId,
      token,
      anon_user_id: null,
      player_name: null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to insert:", error);
    process.exit(1);
  }

  console.log("Created token:");
  console.log(JSON.stringify(data, null, 2));
  console.log(`\nJoin URL: https://pocketdm.com.br/join/${token}`);
}

main().then(() => process.exit(0));
