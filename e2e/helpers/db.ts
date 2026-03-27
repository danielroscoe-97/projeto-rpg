/**
 * Database helpers for E2E tests.
 *
 * -----------------------------------------------------------------
 * TODO: Test DB setup
 * -----------------------------------------------------------------
 * For reliable E2E tests you need an isolated Supabase environment.
 * Options (pick one):
 *
 *   1. Local Supabase (`supabase start`)
 *      - Spin up a local Postgres + Auth + Realtime stack via Docker.
 *      - Seed a test DM user and configure E2E_DM_EMAIL / E2E_DM_PASSWORD.
 *      - Set NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 in .env.test.
 *
 *   2. Dedicated Supabase project (staging)
 *      - Use a separate Supabase project with its own credentials.
 *      - Seed test data via migrations or a seed script.
 *
 *   3. Supabase CLI `db reset` between runs
 *      - Run `supabase db reset` in a globalSetup to get a clean slate.
 *
 * Whichever approach you choose, the helpers below can be used to
 * clean up data created during a test run.
 * -----------------------------------------------------------------
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Create a Supabase admin client for test cleanup.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */
function getServiceClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for test cleanup. " +
        "Set them in .env.local or pass via CLI."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Delete all sessions (and their cascading encounters / combatants)
 * owned by the test DM user.
 *
 * Call this in `test.afterAll` or a global teardown to keep the
 * test database clean between runs.
 */
export async function cleanupTestSessions(ownerEmail: string) {
  const supabase = getServiceClient();

  // Resolve the user id from their email
  const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;

  const testUser = users.users.find((u) => u.email === ownerEmail);
  if (!testUser) {
    console.warn(`[e2e cleanup] No user found for ${ownerEmail} — nothing to clean.`);
    return;
  }

  // Delete sessions owned by this user (cascades to encounters, combatants, session_tokens)
  const { error: delErr } = await supabase
    .from("sessions")
    .delete()
    .eq("owner_id", testUser.id);

  if (delErr) {
    console.error("[e2e cleanup] Failed to delete test sessions:", delErr);
    throw delErr;
  }

  console.log(`[e2e cleanup] Cleaned up sessions for ${ownerEmail}`);
}

/**
 * Delete a single session by ID.
 * Useful for per-test cleanup when you know the session ID.
 */
export async function deleteSession(sessionId: string) {
  const supabase = getServiceClient();

  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);

  if (error) {
    console.error(`[e2e cleanup] Failed to delete session ${sessionId}:`, error);
    throw error;
  }
}
