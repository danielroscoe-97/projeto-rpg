import { createClient } from "./client";
import { trackEvent } from "@/lib/analytics/track";

/** Generate a cryptographically random token for session sharing. */
function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

/** Fetches the existing active token for a session without creating one.
 *  Returns null if no active token exists. */
export async function getExistingSessionToken(
  sessionId: string
): Promise<{ token: string; joinUrl: string } | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("session_tokens")
    .select("token")
    .eq("session_id", sessionId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!data?.token) return null;
  const joinUrl = `${window.location.origin}/join/${data.token}`;
  return { token: data.token, joinUrl };
}

/** Creates a session token and returns the shareable join URL.
 *  Returns the existing active token if one already exists for the session. */
export async function createSessionToken(
  sessionId: string
): Promise<{ token: string; joinUrl: string }> {
  const supabase = createClient();

  // Reuse existing active token to prevent unbounded accumulation
  const { data: existing } = await supabase
    .from("session_tokens")
    .select("token")
    .eq("session_id", sessionId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const token = existing?.token ?? generateToken();

  if (!existing) {
    const { error } = await supabase.from("session_tokens").insert({
      session_id: sessionId,
      token,
      is_active: true,
    });
    if (error) throw new Error(`Failed to create session token: ${error.message}`);
  }

  const joinUrl = `${window.location.origin}/join/${token}`;
  trackEvent("share:link_generated", { session_id: sessionId });
  return { token, joinUrl };
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
