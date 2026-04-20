/**
 * ContinueFromLastSessionServer — Story 02-F full (Epic 02, Area 4, Section 1).
 *
 * Async server component that isolates the "Continue where you left off"
 * query behind a Suspense boundary. The dashboard shell (and every other
 * section on the page) paints immediately; this card streams in when the
 * `users + player_characters + campaigns` JOIN resolves.
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
 *
 * 02-F full: query now joins `player_characters` (default_character_id) and,
 * when the character has a linked campaign, `campaigns` (for the name). When
 * the default character is standalone (no campaign_id), we still show the
 * card but the CTA routes to the character HQ instead of the campaign sheet.
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

  // 02-F full: one round-trip — pull the user's `last_session_at`,
  // `default_character_id`, and `avatar_url`, and JOIN in the default
  // character + its campaign. RLS on `player_characters` enforces
  // `user_id = auth.uid()` so this is safe.
  const { data: userData } = await supabase
    .from("users")
    .select(
      `
      last_session_at,
      default_character_id,
      avatar_url,
      player_characters!users_default_character_id_fkey (
        id,
        name,
        token_url,
        campaign_id,
        campaigns ( id, name )
      )
    `,
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!userData?.last_session_at) return null;

  // The embed may come back as a single object OR an array depending on the
  // FK resolution; normalize defensively.
  const rawChar = userData.player_characters as
    | {
        id: string | null;
        name: string | null;
        token_url: string | null;
        campaign_id: string | null;
        campaigns: { id: string; name: string } | { id: string; name: string }[] | null;
      }
    | Array<{
        id: string | null;
        name: string | null;
        token_url: string | null;
        campaign_id: string | null;
        campaigns: { id: string; name: string } | { id: string; name: string }[] | null;
      }>
    | null;

  const character = Array.isArray(rawChar) ? (rawChar[0] ?? null) : rawChar;
  const rawCampaign = character?.campaigns ?? null;
  const campaign = Array.isArray(rawCampaign) ? (rawCampaign[0] ?? null) : rawCampaign;

  const data: ContinueFromLastSessionData = {
    campaignId: campaign?.id ?? null,
    characterId:
      (character?.id as string | null) ??
      (userData.default_character_id as string | null) ??
      null,
    campaignName: campaign?.name ?? null,
    characterName: character?.name ?? null,
    // Prefer the character's token over the user avatar — it's the portrait
    // most closely tied to "the last session you were in".
    avatarUrl:
      (character?.token_url as string | null) ??
      (userData.avatar_url as string | null) ??
      null,
    lastSessionAt: userData.last_session_at as string,
  };

  return <ContinueFromLastSession data={data} locale={locale} />;
}
