import { createClient } from "@/lib/supabase/client";

export interface WhitelistEntry {
  id: string;
  user_id: string;
  granted_by: string;
  granted_at: string;
  revoked_at: string | null;
  notes: string | null;
  /** Joined from users table (admin API only) */
  user_email?: string;
  user_display_name?: string | null;
  granted_by_email?: string;
}

/**
 * Check if a user is currently whitelisted (active, not revoked).
 * Uses RLS — user can only check their own status.
 */
export async function isUserWhitelisted(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("content_whitelist")
    .select("id")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .maybeSingle();

  return !!data;
}
