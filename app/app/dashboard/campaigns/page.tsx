export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { CampaignManager } from "@/components/dashboard/CampaignManager";
import { PlayerCampaignCard } from "@/components/dashboard/PlayerCampaignCard";
import { PendingInvites } from "@/components/dashboard/PendingInvites";
import { CampaignsPageClient } from "@/components/dashboard/CampaignsPageClient";
import type { UserRole } from "@/lib/stores/role-store";
import {
  getUserMemberships,
  getPendingInvites,
} from "@/lib/supabase/campaign-membership";

export default async function CampaignsPage() {
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: userData } = await supabase
    .from("users")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle();

  const userRole = (userData?.role as UserRole) ?? "both";
  const userEmail = userData?.email ?? user.email ?? "";

  const memberships = await getUserMemberships(user.id);
  const pendingInvites = await getPendingInvites(userEmail);

  const { data: rawCampaigns } = await supabase
    .from("campaigns")
    .select(`
      id, name, created_at, is_archived,
      player_characters(count),
      sessions(count),
      campaign_notes(count),
      campaign_npcs(count)
    `)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch last session date per campaign
  const campaignIds = (rawCampaigns ?? []).map((c) => c.id as string);
  let lastSessionMap: Record<string, string> = {};
  if (campaignIds.length > 0) {
    const { data: sessionsData } = await supabase
      .from("sessions")
      .select("campaign_id, updated_at")
      .in("campaign_id", campaignIds)
      .order("updated_at", { ascending: false });
    // Take first (most recent) per campaign
    for (const s of sessionsData ?? []) {
      const cid = s.campaign_id as string;
      if (!lastSessionMap[cid]) {
        lastSessionMap[cid] = s.updated_at as string;
      }
    }
  }

  const campaigns = (rawCampaigns ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    created_at: c.created_at as string,
    player_count:
      (c.player_characters as { count: number }[])[0]?.count ?? 0,
    session_count:
      (c.sessions as { count: number }[])[0]?.count ?? 0,
    note_count:
      (c.campaign_notes as { count: number }[])[0]?.count ?? 0,
    npc_count:
      (c.campaign_npcs as { count: number }[])[0]?.count ?? 0,
    last_session_date: lastSessionMap[c.id as string] ?? null,
    is_archived: (c.is_archived as boolean) ?? false,
  }));

  const playerMemberships = memberships.filter((m) => m.role === "player");

  const translations = {
    campaigns_title: t("campaigns_title"),
    dm_tables_title: t("dm_tables_title"),
    player_tables_title: t("player_tables_title"),
    pending_invites: t("pending_invites"),
    invited_by: t("invited_by"),
    accept_invite: t("accept_invite"),
    decline_invite: t("decline_invite"),
    invite_accept_error: t("invite_accept_error"),
    invite_decline_error: t("invite_decline_error"),
    invite_accepted_redirect: t("invite_accepted_redirect"),
    active_session: t("active_session"),
    no_active_session: t("no_active_session"),
    campaigns_players_singular: t("campaigns_players_singular"),
    campaigns_players_plural: t("campaigns_players_plural"),
    dm_label: t("dm_label"),
    hp_full: t("sheet.hp_full"),
    hp_light: t("sheet.hp_light"),
    hp_moderate: t("sheet.hp_moderate"),
    hp_heavy: t("sheet.hp_heavy"),
    hp_critical: t("sheet.hp_critical"),
  };

  return (
    <CampaignsPageClient
      campaigns={campaigns}
      userId={user.id}
      userRole={userRole}
      playerMemberships={playerMemberships}
      pendingInvites={pendingInvites}
      translations={translations}
    />
  );
}
