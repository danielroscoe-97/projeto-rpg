import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCampaignMembership } from "@/lib/supabase/campaign-membership";
import { PlayerHqShell } from "@/components/player-hq/PlayerHqShell";
import { isPlayerHqV2Enabled } from "@/lib/flags/player-hq-v2";
import {
  LEGACY_TAB_REDIRECTS,
  buildRedirectTarget,
  resolveTabParam,
} from "@/lib/navigation/legacy-tab-redirects";

export const metadata: Metadata = {
  title: "Player HQ",
};

/**
 * Sprint 3 Track A · Story B3 — back-compat for legacy `?tab=` deep links.
 *
 * When the V2 flag is ON and a legacy V1 tab key arrives in the query
 * string, we issue a server-side `redirect()` so there is no client flash
 * and browser history stays sane. When the flag is OFF, the helper returns
 * `null` and behavior is unchanged (V1 ignores the param at SSR; the
 * legacy shell consumes it client-side as it already did).
 *
 * Mapping + URL builder live in `lib/navigation/legacy-tab-redirects.ts`
 * so they can be unit-tested in isolation (see neighboring `__tests__/`).
 */

export default async function PlayerHqSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  // Deep-link back-compat (B3) — only active when V2 flag is on.
  if (isPlayerHqV2Enabled()) {
    const tab = resolveTabParam(sp);
    if (typeof tab === "string" && tab in LEGACY_TAB_REDIRECTS) {
      const mapping = LEGACY_TAB_REDIRECTS[tab];
      redirect(buildRedirectTarget(id, mapping, sp));
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [membership, { data: campaign }, { data: onboarding }] = await Promise.all([
    getCampaignMembership(id, user.id),
    supabase.from("campaigns").select("id, name").eq("id", id).single(),
    supabase.from("user_onboarding").select("player_hq_tour_completed").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!campaign) redirect("/app/dashboard");
  if (!membership || membership.role !== "player") redirect(`/app/campaigns/${id}`);

  // Get the player's character
  const { data: character } = await supabase
    .from("player_characters")
    .select("id")
    .eq("campaign_id", id)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!character) redirect(`/app/campaigns/${id}`);

  return (
    <PlayerHqShell
      characterId={character.id}
      campaignId={id}
      campaignName={campaign.name}
      userId={user.id}
      playerHqTourCompleted={onboarding?.player_hq_tour_completed ?? false}
    />
  );
}
