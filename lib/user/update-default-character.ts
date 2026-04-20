"use server";

/**
 * updateDefaultCharacter — Story 02-G (Epic 02, Area 5).
 *
 * Server action that sets `users.default_character_id` for the authenticated
 * user. Delegated to the `update_default_character_if_owner` RPC (migration
 * 156) which performs the ownership check and the UPDATE in a SINGLE
 * statement (no TOCTOU race between check and write).
 *
 * Returns a discriminated union so the calling client can surface the
 * failure mode to the UI without plumbing generic error strings.
 *
 * WINSTON M11 NOTE — race-free ownership:
 *   Earlier version did a two-query dance: SELECT player_characters (owner
 *   check), then UPDATE users. A concurrent DELETE of the character between
 *   the two statements would let the UPDATE persist a (briefly-dangling) id.
 *   The RPC collapses both into one UPDATE with an EXISTS subquery so the
 *   check and write are atomic under the same snapshot.
 */

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type UpdateDefaultCharacterResult =
  | { ok: true }
  | { ok: false; error: "unauthenticated" | "not_owner" | "write_failed" };

export async function updateDefaultCharacter(
  characterId: string,
): Promise<UpdateDefaultCharacterResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // Single-query atomic: ownership check and UPDATE happen together inside
  // the RPC. Returns { ok, reason } where reason identifies the failure mode.
  const { data, error } = await supabase.rpc(
    "update_default_character_if_owner",
    { p_character_id: characterId },
  );

  if (error) return { ok: false, error: "write_failed" };

  const result = data as { ok: boolean; reason: string | null } | null;
  if (!result || !result.ok) {
    if (result?.reason === "not_owner") {
      return { ok: false, error: "not_owner" };
    }
    if (result?.reason === "unauthenticated") {
      return { ok: false, error: "unauthenticated" };
    }
    return { ok: false, error: "write_failed" };
  }

  // Revalidate both the dashboard (which reads default_character_id for the
  // badge) and the settings page itself so the new badge appears without a
  // client-side refresh.
  revalidatePath("/app/dashboard");
  revalidatePath("/app/dashboard/settings/default-character");

  return { ok: true };
}
