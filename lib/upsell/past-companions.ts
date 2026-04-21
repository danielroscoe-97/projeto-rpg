"use server";

/**
 * Epic 04 (Player-as-DM Upsell), Story 04-D — Área 5 (Viral Cross-invite).
 *
 * Thin wrapper around the SECURITY DEFINER RPC `get_past_companions()`
 * introduced by `supabase/migrations/169_past_companions.sql`.
 *
 * Design notes
 * ────────────
 * - The RPC already enforces `auth.uid()` server-side and honours the D8
 *   privacy opt-out (`users.share_past_companions`). Callers DO NOT need
 *   to duplicate those checks here.
 * - Pagination caps are enforced inside the function (min 1, max 200);
 *   we pass-through whatever the caller provides and defer validation
 *   to SQL so the invariant has exactly one source of truth.
 * - Errors degrade silently: the Área 5 UI renders the "Convide quem
 *   jogou com você" tab only when the list is non-empty (F28), so
 *   returning `[]` on error keeps the tab hidden instead of breaking
 *   the DM dashboard. The underlying error is logged by Supabase.
 */

import { createClient } from "@/lib/supabase/server";
import type { PastCompanion } from "@/lib/types/database";

export type { PastCompanion } from "@/lib/types/database";

/**
 * Returns users who share at least one session with `auth.uid()`.
 * Empty array on any error — the calling UI treats an empty list as
 * "no companions to invite" and hides the tab (F28).
 */
export async function getPastCompanions(
  limit?: number,
  offset?: number,
): Promise<PastCompanion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_past_companions", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error || !data) return [];
  return data as PastCompanion[];
}
