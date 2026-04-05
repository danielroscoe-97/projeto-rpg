export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { GuestDataImportModal } from "@/components/dashboard/GuestDataImportModal";
import { computeStreak } from "@/lib/utils/streak";
import type { SavedEncounterRow } from "@/components/dashboard/SavedEncounters";
import type { UserRole } from "@/lib/stores/role-store";
import type { UserOnboarding } from "@/lib/types/database";
import {
  getUserMemberships,
  getPendingInvites,
} from "@/lib/supabase/campaign-membership";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const ts = await getTranslations("sidebar");
  const tm = await getTranslations("methodology");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch user role
  const { data: userData } = await supabase
    .from("users")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle();

  const userRole = (userData?.role as UserRole) ?? "both";
  const userEmail = userData?.email ?? user.email ?? "";

  // Fetch memberships (dual-role: DM + Player campaigns)
  const memberships = await getUserMemberships(user.id);

  // Fetch onboarding state
  const { data: onboardingData } = await supabase
    .from("user_onboarding")
    .select("wizard_completed, dashboard_tour_completed, source")
    .eq("user_id", user.id)
    .maybeSingle();

  const onboarding = onboardingData as Pick<UserOnboarding, "wizard_completed" | "dashboard_tour_completed" | "source"> | null;

  // Onboarding redirect — any user who hasn't completed the wizard and has no campaigns/memberships
  {
    const wizardDone = onboarding?.wizard_completed ?? false;
    if (!wizardDone && memberships.length === 0) {
      const { count, error: countErr } = await supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id);

      if (!countErr && count === 0) redirect("/app/onboarding");
    }
  }

  // Fetch pending invites
  const pendingInvites = await getPendingInvites(userEmail);

  // Fetch campaigns owned by user
  const { data: rawCampaigns } = await supabase
    .from("campaigns")
    .select("id, name, created_at, updated_at, cover_image_url, player_characters(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const campaigns = (rawCampaigns ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    created_at: c.created_at as string,
    cover_image_url: (c.cover_image_url as string | null) ?? null,
    player_count:
      (c.player_characters as { count: number }[])[0]?.count ?? 0,
    last_combat: (c.updated_at as string | null) ?? null,
  }));

  // Fetch active encounters for resume
  const { data: rawEncounters } = await supabase
    .from("encounters")
    .select("id, name, round_number, is_active, updated_at, session_id, sessions!inner(id, name, owner_id)")
    .eq("sessions.owner_id", user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(5);

  const savedEncounters: SavedEncounterRow[] = (rawEncounters ?? []).map((e) => ({
    session_id: e.session_id as string,
    encounter_name: (e.name ?? "Encounter") as string,
    session_name: ((e.sessions as unknown as Record<string, unknown>)?.name ?? "Session") as string,
    round_number: (e.round_number ?? 1) as number,
    is_active: (e.is_active ?? false) as boolean,
    updated_at: (e.updated_at ?? "") as string,
  }));

  // Pre-translate strings for client component
  const translations = {
    title: t("title"),
    description: t("description"),
    new_session: t("new_session"),
    dm_tables_title: t("dm_tables_title"),
    player_tables_title: t("player_tables_title"),
    pending_invites: t("pending_invites"),
    quick_combat: t("quick_combat"),
    waiting_for_invite: t("waiting_for_invite"),
    waiting_for_invite_desc: t("waiting_for_invite_desc"),
    try_quick_combat: t("try_quick_combat"),
    active_session: t("active_session"),
    no_active_session: t("no_active_session"),
    invited_by: t("invited_by"),
    accept_invite: t("accept_invite"),
    decline_invite: t("decline_invite"),
    invite_accept_error: t("invite_accept_error"),
    invite_decline_error: t("invite_decline_error"),
    invite_accepted_redirect: t("invite_accepted_redirect"),
    campaigns_players_singular: t("campaigns_players_singular"),
    campaigns_players_plural: t("campaigns_players_plural"),
    dm_label: t("dm_label"),
    encounters_round: t("encounters_round"),
    encounters_in_progress: t("encounters_in_progress"),
    campaigns_manage: t("campaigns_manage_players"),
    // Quick actions
    quick_actions: ts("quick_actions"),
    new_combat: ts("new_combat"),
    create_npc: ts("create_npc"),
    invite_player: ts("invite_player"),
    ongoing_combats: t("ongoing_combats"),
    npc_dialog_title: t("npc_dialog_title"),
    npc_global_title: t("npc_global_title"),
    npc_global_desc: t("npc_global_desc"),
    npc_for_campaign: t("npc_for_campaign"),
    npc_created_success: t("npc_created_success"),
    invite_dialog_title: t("invite_dialog_title"),
    no_campaigns_yet: t("no_campaigns_yet"),
    no_campaigns_create: t("no_campaigns_create"),
    no_campaigns_cta: t("no_campaigns_cta"),
    npc_global_badge: t("npc_global_badge"),
    // Story 11.0 additions
    view_all: t("view_all"),
    dm_empty_title: t("dm_empty_title"),
    dm_empty_desc: t("dm_empty_desc"),
    dm_empty_cta: t("dm_empty_cta"),
    dm_empty_title_v2: t("dm_empty_title_v2"),
    dm_empty_desc_v2: t("dm_empty_desc_v2"),
    dm_empty_cta_campaign: t("dm_empty_cta_campaign"),
    dm_empty_cta_quick: t("dm_empty_cta_quick"),
    dm_nudge_invite: t("dm_nudge_invite"),
    dm_nudge_invite_desc: t("dm_nudge_invite_desc"),
    combats_empty_title: t("combats_empty_title"),
    combats_empty_cta: t("combats_empty_cta"),
    // Methodology hooks
    methodology_lab_tooltip: tm("lab_badge_tooltip"),
    methodology_milestone_toast: tm("milestone_toast"),
    methodology_milestone_link: tm("milestone_link"),
    methodology_researcher_title: tm("researcher_title"),
    methodology_researcher_subtitle: tm("researcher_subtitle"),
    methodology_researcher_link: tm("researcher_link"),
    campaign_joined_success: t("campaign_joined_success"),
  };

  // F6: Streak counter
  const streakWeeks = userRole !== "player" ? await computeStreak(supabase, user.id) : 0;

  return (
    <div>
      <GuestDataImportModal />
      <DashboardOverview
        campaigns={campaigns}
        savedEncounters={savedEncounters}
        userId={user.id}
        userRole={userRole}
        memberships={memberships}
        pendingInvites={pendingInvites}
        translations={translations}
        streakWeeks={streakWeeks}
      />
    </div>
  );
}
