/**
 * /app/dashboard/settings/default-character — Story 02-G (Epic 02, Area 5).
 *
 * Manual override for the "default character" auto-rule. Lists every
 * `player_character` belonging to the authenticated user plus which one is
 * currently marked via `users.default_character_id`, and delegates mutation
 * to `updateDefaultCharacter` server action.
 *
 * RLS naturally scopes `player_characters` to `user_id = auth.uid()`, so the
 * query here is safe to run with the user's session client.
 */

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import {
  DefaultCharacterSettings,
  type DefaultCharacterRow,
} from "@/components/dashboard/DefaultCharacterSettings";

export default async function DefaultCharacterSettingsPage() {
  const [user, supabase] = await Promise.all([getAuthUser(), createClient()]);
  if (!user) redirect("/auth/login");

  const [charsRes, userRes] = await Promise.all([
    supabase
      .from("player_characters")
      .select("id, name, race, class, level, token_url, campaign_id, campaigns ( id, name )")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("users")
      .select("default_character_id")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const raw = charsRes.data ?? [];
  const defaultCharacterId =
    (userRes.data?.default_character_id as string | null) ?? null;

  const chars: DefaultCharacterRow[] = raw.map((c) => {
    const rawCamp = c.campaigns as
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null;
    const camp = Array.isArray(rawCamp) ? (rawCamp[0] ?? null) : rawCamp;
    return {
      id: c.id as string,
      name: (c.name as string) ?? "",
      race: (c.race as string | null) ?? null,
      characterClass: (c.class as string | null) ?? null,
      level: (c.level as number | null) ?? null,
      tokenUrl: (c.token_url as string | null) ?? null,
      campaignId: (c.campaign_id as string | null) ?? null,
      campaignName: camp?.name ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <DefaultCharacterSettings
        characters={chars}
        defaultCharacterId={defaultCharacterId}
      />
    </div>
  );
}
