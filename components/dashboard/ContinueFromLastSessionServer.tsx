/**
 * ContinueFromLastSessionServer — Story 02-F parte 1 (Epic 02, Area 4).
 *
 * Async server component that isolates the "Continue where you left off"
 * query behind a Suspense boundary. This way the dashboard shell (and every
 * other section on the page) paints immediately, and only THIS card waits on
 * the `users.last_session_at` + future JOIN query.
 *
 * Code-review C3 fix: previously the query was inlined in
 * `app/app/dashboard/page.tsx` inside a top-level `Promise.all`, which meant
 * the skeleton never rendered (server blocked until every query resolved
 * before returning JSX). By extracting here and wrapping in `<Suspense>`,
 * React streams the skeleton on the first flush and swaps in the loaded
 * card when this component's promise resolves.
 *
 * Code-review M1 fix: we pass the user's locale down as a prop (resolved via
 * `getLocale()` from next-intl/server) so the client component can format the
 * relative-time string without touching `navigator.language` at hydration.
 */

import { getLocale } from "next-intl/server";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import {
  ContinueFromLastSession,
  type ContinueFromLastSessionData,
} from "@/components/dashboard/ContinueFromLastSession";

export async function ContinueFromLastSessionServer() {
  const [user, supabase, locale] = await Promise.all([
    getAuthUser(),
    createClient(),
    getLocale(),
  ]);

  if (!user) return null;

  // 02-F parte 1: pull `last_session_at`, `default_character_id`, and
  // `avatar_url` for the "Continue where you left off" card. Story 02-F-full
  // will replace the derived campaign/character fields below with a real JOIN
  // on `campaigns` + `player_characters`.
  const { data: userData } = await supabase
    .from("users")
    .select("last_session_at, default_character_id, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!userData?.last_session_at) return null;

  const data: ContinueFromLastSessionData = {
    campaignId: null, // resolved in 02-F-full
    characterId: (userData.default_character_id as string | null) ?? null,
    campaignName: null, // resolved in 02-F-full — falls back to i18n
    characterName: null, // resolved in 02-F-full — falls back to i18n
    avatarUrl: (userData.avatar_url as string | null) ?? null,
    lastSessionAt: userData.last_session_at as string,
  };

  return <ContinueFromLastSession data={data} locale={locale} />;
}
