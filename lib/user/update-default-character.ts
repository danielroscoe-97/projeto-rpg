"use server";

/**
 * updateDefaultCharacter — Story 02-G (Epic 02, Area 5).
 *
 * Server action that sets `users.default_character_id` for the authenticated
 * user. Ownership is verified in-action before the UPDATE fires, since RLS
 * on `users` allows the user to update their own row freely (including
 * setting arbitrary character IDs in `default_character_id`, which is just
 * a foreign key). The ownership pre-check ensures we never persist an ID
 * that doesn't belong to the caller.
 *
 * Returns a discriminated union so the calling client can surface the
 * failure mode to the UI without plumbing generic error strings.
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

  // Verify character ownership. We filter on `user_id = user.id` so a
  // malicious client cannot smuggle another player's character id.
  const { data: char, error: charErr } = await supabase
    .from("player_characters")
    .select("id")
    .eq("id", characterId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (charErr || !char) return { ok: false, error: "not_owner" };

  const { error: updateErr } = await supabase
    .from("users")
    .update({ default_character_id: characterId })
    .eq("id", user.id);
  if (updateErr) return { ok: false, error: "write_failed" };

  // Revalidate both the dashboard (which reads default_character_id for the
  // badge) and the settings page itself so the new badge appears without a
  // client-side refresh.
  revalidatePath("/app/dashboard");
  revalidatePath("/app/dashboard/settings/default-character");

  return { ok: true };
}
