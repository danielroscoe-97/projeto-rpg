import { createClient } from "@/lib/supabase/client";
import { CURRENT_AGREEMENT_VERSION } from "@/lib/constants/content";

export interface ContentAgreement {
  id: string;
  user_id: string;
  agreed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  agreement_version: number;
}

/**
 * Check if the current user has agreed to the current agreement version.
 * Uses RLS — user can only check their own agreements.
 */
export async function hasUserAgreed(
  userId: string,
  version: number = CURRENT_AGREEMENT_VERSION
): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("content_agreements")
    .select("id")
    .eq("user_id", userId)
    .eq("agreement_version", version)
    .maybeSingle();

  return !!data;
}
