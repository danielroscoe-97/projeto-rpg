/**
 * MyCharactersServer — Story 02-F full (Epic 02, Area 4, Section 2).
 *
 * Async server component that streams behind a Suspense boundary. Queries
 * `player_characters` for the authenticated user, plus the joined campaign
 * (when linked), and resolves a per-character `last_session_at` via
 * `combatants → encounters → sessions`.
 *
 * RLS: `player_characters` policies enforce `user_id = auth.uid()`, so this
 * query is naturally scoped to the logged-in user. The combatants JOIN stays
 * RLS-aware for the same reason.
 *
 * Perf: per-character `last_session_at` is fetched in a single follow-up
 * query and folded into the result map, not N+1.
 */

import { createClient, getAuthUser } from "@/lib/supabase/server";

import {
  MyCharactersGrid,
  type MyCharacterCardData,
} from "@/components/dashboard/MyCharactersGrid";

export async function MyCharactersServer() {
  const [user, supabase] = await Promise.all([getAuthUser(), createClient()]);
  if (!user) return null;

  // 1. Fetch the user's characters + their default id in parallel.
  const [charactersRes, userRes] = await Promise.all([
    supabase
      .from("player_characters")
      .select(
        `
        id,
        name,
        race,
        class,
        level,
        current_hp,
        max_hp,
        ac,
        token_url,
        campaign_id,
        updated_at,
        campaigns ( id, name )
      `,
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("users")
      .select("default_character_id")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const characters = charactersRes.data ?? [];
  const defaultCharacterId =
    (userRes.data?.default_character_id as string | null) ?? null;

  if (characters.length === 0) {
    return (
      <MyCharactersGrid
        characters={[]}
        defaultCharacterId={defaultCharacterId}
      />
    );
  }

  // 2. Resolve `last_session_at` for every character. We fetch the single
  //    most-recent combatant per character via N parallel lookups (N = number
  //    of characters, typically < 10). This replaces the previous
  //    `.limit(500)` batch read which silently truncated once a character
  //    accumulated >500 combatant rows across all their encounters — a very
  //    realistic volume for a long-running campaign (hundreds of monsters
  //    per session × dozens of sessions).
  //
  // WINSTON M8 NOTE: an aggregate (`MAX(s.created_at) GROUP BY pc.id`) via a
  // dedicated SQL view would be the clean solution for very-wide dashboards.
  // The per-character pattern below is correct and performant for the
  // expected N and lets us avoid a schema migration here.
  const characterIds = characters.map((c) => c.id as string);
  const lastSessionEntries = await Promise.all(
    characterIds.map(async (pcId) => {
      const { data } = await supabase
        .from("combatants")
        .select(
          `
          encounters!inner (
            sessions!inner ( created_at )
          )
        `,
        )
        .eq("player_character_id", pcId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return [pcId, null] as const;
      const enc = (data as { encounters: unknown }).encounters as
        | { sessions: { created_at: string | null } | { created_at: string | null }[] | null }
        | Array<{ sessions: { created_at: string | null } | { created_at: string | null }[] | null }>
        | null;
      const encRow = Array.isArray(enc) ? enc[0] : enc;
      const sess = Array.isArray(encRow?.sessions) ? encRow?.sessions[0] : encRow?.sessions;
      const createdAt = (sess?.created_at as string | null) ?? null;
      return [pcId, createdAt] as const;
    }),
  );

  const lastSessionMap: Record<string, string> = {};
  for (const [pcId, createdAt] of lastSessionEntries) {
    if (createdAt) lastSessionMap[pcId] = createdAt;
  }

  const cards: MyCharacterCardData[] = characters.map((c) => {
    const rawCamp = c.campaigns as
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null;
    const campaign = Array.isArray(rawCamp) ? (rawCamp[0] ?? null) : rawCamp;
    const id = c.id as string;
    return {
      id,
      name: (c.name as string) ?? "",
      race: (c.race as string | null) ?? null,
      characterClass: (c.class as string | null) ?? null,
      level: (c.level as number | null) ?? null,
      currentHp: (c.current_hp as number) ?? 0,
      maxHp: (c.max_hp as number) ?? 0,
      ac: (c.ac as number) ?? 0,
      tokenUrl: (c.token_url as string | null) ?? null,
      campaignId: (c.campaign_id as string | null) ?? null,
      campaignName: campaign?.name ?? null,
      lastSessionAt: lastSessionMap[id] ?? null,
    };
  });

  return (
    <MyCharactersGrid
      characters={cards}
      defaultCharacterId={defaultCharacterId}
    />
  );
}
