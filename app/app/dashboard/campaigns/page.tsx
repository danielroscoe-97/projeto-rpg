export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { captureError } from "@/lib/errors/capture";
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
  // Create a SINGLE supabase client and verify auth on it FIRST.
  // This ensures the token refresh (if any) happens on the same client
  // that will run all subsequent queries — avoids stale-token RLS failures
  // that caused intermittent empty campaign lists.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Now parallelize translations + queries (all using the same authed client)
  const [t, tSheet, userDataRes, memberships, pendingInvites, campaignsRes] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("sheet"),
    supabase.from("users").select("role, email").eq("id", user.id).maybeSingle(),
    getUserMemberships(user.id),
    getPendingInvites(user.email ?? ""),
    supabase
      .from("campaigns")
      .select(`
        id, name, created_at, is_archived,
        player_characters(count),
        sessions(count),
        campaign_notes(count),
        campaign_npcs(count)
      `)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const userData = userDataRes.data;
  const userRole = (userData?.role as UserRole) ?? "both";
  const userEmail = userData?.email ?? user.email ?? "";

  if (campaignsRes.error) {
    captureError(new Error(`Failed to fetch campaigns: ${campaignsRes.error.message}`), {
      component: "CampaignsPage",
      action: "fetchCampaigns",
      category: "database",
      extra: { userId: user.id, code: campaignsRes.error.code },
    });
  }
  const rawCampaigns = campaignsRes.data;

  // Re-fetch pending invites with DB email if it differs from auth email
  const finalPendingInvites = (userEmail && userEmail !== user.email)
    ? await getPendingInvites(userEmail)
    : pendingInvites;

  // Fetch last session date + encounter counts per campaign
  const campaignIds = (rawCampaigns ?? []).map((c) => c.id as string);
  let lastSessionMap: Record<string, string> = {};
  let encounterCountMap: Record<string, number> = {};
  if (campaignIds.length > 0) {
    const { data: sessionsData } = await supabase
      .from("sessions")
      .select("id, campaign_id, updated_at")
      .in("campaign_id", campaignIds)
      .order("updated_at", { ascending: false });
    // Take first (most recent) per campaign
    const sessionIds: string[] = [];
    for (const s of sessionsData ?? []) {
      const cid = s.campaign_id as string;
      sessionIds.push(s.id as string);
      if (!lastSessionMap[cid]) {
        lastSessionMap[cid] = s.updated_at as string;
      }
    }
    // Count encounters per campaign via sessions
    if (sessionIds.length > 0) {
      const { data: encountersData } = await supabase
        .from("encounters")
        .select("session_id")
        .in("session_id", sessionIds);
      // Build session→campaign map, then count encounters per campaign
      const sessionToCampaign: Record<string, string> = {};
      for (const s of sessionsData ?? []) {
        sessionToCampaign[s.id as string] = s.campaign_id as string;
      }
      for (const e of encountersData ?? []) {
        const cid = sessionToCampaign[e.session_id as string];
        if (cid) encounterCountMap[cid] = (encounterCountMap[cid] ?? 0) + 1;
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
    encounter_count: encounterCountMap[c.id as string] ?? 0,
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
    hp_full: tSheet("hp_full"),
    hp_light: tSheet("hp_light"),
    hp_moderate: tSheet("hp_moderate"),
    hp_heavy: tSheet("hp_heavy"),
    hp_critical: tSheet("hp_critical"),
  };

  return (
    <CampaignsPageClient
      campaigns={campaigns}
      userId={user.id}
      userRole={userRole}
      playerMemberships={playerMemberships}
      pendingInvites={finalPendingInvites}
      translations={translations}
    />
  );
}
