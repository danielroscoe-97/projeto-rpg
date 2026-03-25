import { createClient } from "./client";

/** Generate a cryptographically random token for session sharing. */
function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

/** Creates a session token and returns the shareable join URL. */
export async function createSessionToken(
  sessionId: string
): Promise<{ token: string; joinUrl: string }> {
  const supabase = createClient();
  const token = generateToken();

  const { error } = await supabase.from("session_tokens").insert({
    session_id: sessionId,
    token,
    is_active: true,
  });

  if (error) throw new Error(`Failed to create session token: ${error.message}`);

  const joinUrl = `${window.location.origin}/join/${token}`;
  return { token, joinUrl };
}

/** Validates a session token and returns the session + encounter data. */
export async function validateSessionToken(token: string): Promise<{
  session_id: string;
  token_id: string;
  session_name: string;
  encounter_id: string | null;
} | null> {
  const supabase = createClient();

  // Look up active token
  const { data: tokenRow, error: tokenError } = await supabase
    .from("session_tokens")
    .select("id, session_id")
    .eq("token", token)
    .eq("is_active", true)
    .single();

  if (tokenError || !tokenRow) return null;

  // Verify session is active
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, name, is_active")
    .eq("id", tokenRow.session_id)
    .eq("is_active", true)
    .single();

  if (sessionError || !session) return null;

  // Find active encounter
  const { data: encounter } = await supabase
    .from("encounters")
    .select("id")
    .eq("session_id", session.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return {
    session_id: session.id,
    token_id: tokenRow.id,
    session_name: session.name,
    encounter_id: encounter?.id ?? null,
  };
}

/** Links the anonymous user's auth.uid to the session token. */
export async function linkAnonymousUser(
  tokenId: string,
  anonUserId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("session_tokens")
    .update({
      anon_user_id: anonUserId,
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", tokenId);

  if (error) throw new Error(`Failed to link anonymous user: ${error.message}`);
}

/** Expires all tokens for a session (called when DM ends session). */
export async function expireSessionTokens(sessionId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("session_tokens")
    .update({ is_active: false })
    .eq("session_id", sessionId);

  if (error) throw new Error(`Failed to expire session tokens: ${error.message}`);
}
