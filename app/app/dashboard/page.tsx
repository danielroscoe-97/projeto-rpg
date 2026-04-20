export const dynamic = "force-dynamic";

import { Suspense } from "react";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { GuestDataImportModal } from "@/components/dashboard/GuestDataImportModal";
import { ContinueFromLastSessionServer } from "@/components/dashboard/ContinueFromLastSessionServer";
import { ContinueFromLastSessionSkeleton } from "@/components/dashboard/ContinueFromLastSessionSkeleton";
import { computeStreak } from "@/lib/utils/streak";
import { grantXpAsync, getCooldownStart } from "@/lib/xp/grant-xp";
import type { SavedEncounterRow } from "@/components/dashboard/SavedEncounters";
import type { UserRole } from "@/lib/stores/role-store";
import type { UserOnboarding } from "@/lib/types/database";
import {
  getUserMemberships,
  getPendingInvites,
} from "@/lib/supabase/campaign-membership";

export default async function DashboardPage() {
  // Phase 0: Parallelize all independent async setup (getAuthUser is cached per-request)
  const [t, ts, tm, tpc, user, supabase] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("sidebar"),
    getTranslations("methodology"),
    getTranslations("player_checklist"),
    getAuthUser(),
    createClient(),
  ]);

  if (!user) redirect("/auth/login");

  // Phase 1: Fire ALL independent queries in parallel (biggest perf win)
  const [
    userDataRes,
    memberships,
    onboardingRes,
    pendingInvites,
    campaignsRes,
    encountersRes,
    encounterCountRes,
  ] = await Promise.all([
    // Role/email drive checklist & redirects here. The
    // `last_session_at` / `default_character_id` / `avatar_url` fields used
    // by the "Continue where you left off" card now live in their own async
    // server component (ContinueFromLastSessionServer) so the card can stream
    // in behind a Suspense boundary — see below.
    supabase
      .from("users")
      .select("role, email")
      .eq("id", user.id)
      .maybeSingle(),
    getUserMemberships(user.id),
    supabase.from("user_onboarding").select("wizard_completed, dashboard_tour_completed, source").eq("user_id", user.id).maybeSingle(),
    getPendingInvites(user.email ?? ""),
    supabase.from("campaigns").select("id, name, created_at, updated_at, cover_image_url, player_characters(count)").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("encounters").select("id, name, round_number, is_active, updated_at, session_id, sessions!inner(id, name, owner_id)").eq("sessions.owner_id", user.id).eq("is_active", true).order("updated_at", { ascending: false }).limit(5),
    supabase.from("encounters").select("id, sessions!inner(owner_id)", { count: "exact", head: true }).eq("sessions.owner_id", user.id),
  ]);

  const userData = userDataRes.data;
  const userRole = (userData?.role as UserRole) ?? "both";
  const userEmail = userData?.email ?? user.email ?? "";

  // 02-F parte 1 — "Continue de onde parou" card is rendered below inside a
  // Suspense boundary via <ContinueFromLastSessionServer />, which owns its
  // own query so the skeleton can paint while that query resolves. See
  // `components/dashboard/ContinueFromLastSessionServer.tsx`.
  const onboarding = onboardingRes.data as Pick<UserOnboarding, "wizard_completed" | "dashboard_tour_completed" | "source"> | null;
  const hasUsedCombat = (encounterCountRes.count ?? 0) > 0;

  // Re-fetch pending invites with DB email if it differs from auth email
  const finalPendingInvites = (userEmail && userEmail !== user.email)
    ? await getPendingInvites(userEmail)
    : pendingInvites;

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

  const campaigns = (campaignsRes.data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    created_at: c.created_at as string,
    cover_image_url: (c.cover_image_url as string | null) ?? null,
    player_count:
      (c.player_characters as { count: number }[])[0]?.count ?? 0,
    last_combat: (c.updated_at as string | null) ?? null,
  }));

  const savedEncounters: SavedEncounterRow[] = (encountersRes.data ?? []).map((e) => ({
    session_id: e.session_id as string,
    encounter_name: (e.name ?? "Encounter") as string,
    session_name: ((e.sessions as unknown as Record<string, unknown>)?.name ?? "Session") as string,
    round_number: (e.round_number ?? 1) as number,
    is_active: (e.is_active ?? false) as boolean,
    updated_at: (e.updated_at ?? "") as string,
  }));

  // Phase 2+3+Streak: Fire all role-conditional queries in ONE parallel wave.
  // Previously these ran in three sequential phases (DM checklist → player checklist → streak).
  // Now we build all promises upfront and await them together.
  // Perf note (B04 SPIKE): this removes 150-250ms of sequential waterfall on dashboard load.
  const isDmRoleForQueries = userRole !== "player";
  const isPlayerRoleForQueries = userRole === "player" || userRole === "both";

  // Player checklist inputs
  const playerMemberships = memberships.filter((m) => m.role === "player");
  const playerCampaignIds = playerMemberships.map((m) => m.campaign_id);
  const shouldQueryPlayerChecklist = isPlayerRoleForQueries && playerMemberships.length > 0;

  const [
    inviteRes,
    legendaryRes,
    recapRes,
    playerCharRes,
    playerSessionRes,
    streakWeeks,
  ] = await Promise.all([
    // DM checklist — only when DM role
    isDmRoleForQueries
      ? supabase
          .from("session_tokens")
          .select("id, sessions!inner(owner_id)", { count: "exact", head: true })
          .eq("sessions.owner_id", user.id)
          .not("player_name", "is", null)
      : Promise.resolve({ count: 0 } as const),
    isDmRoleForQueries
      ? supabase
          .from("combatants")
          .select("id, encounters!inner(session_id, sessions!inner(owner_id))", { count: "exact", head: true })
          .eq("encounters.sessions.owner_id", user.id)
          .gt("legendary_actions_used", 0)
      : Promise.resolve({ count: 0 } as const),
    isDmRoleForQueries
      ? supabase
          .from("combat_reports")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id)
      : Promise.resolve({ count: 0 } as const),
    // Player checklist — only when player has memberships
    shouldQueryPlayerChecklist
      ? supabase
          .from("player_characters")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("campaign_id", playerCampaignIds)
      : Promise.resolve({ count: 0 } as const),
    shouldQueryPlayerChecklist
      ? supabase
          .from("session_tokens")
          .select("id", { count: "exact", head: true })
          .eq("player_user_id", user.id)
      : Promise.resolve({ count: 0 } as const),
    // Streak — only for DM/both
    isDmRoleForQueries ? computeStreak(supabase, user.id) : Promise.resolve(0),
  ]);

  const checklistStatus = {
    hasAccount: true,
    hasRunCombat: hasUsedCombat,
    hasInvitedPlayer: isDmRoleForQueries && (inviteRes.count ?? 0) > 0,
    hasUsedLegendary: isDmRoleForQueries && (legendaryRes.count ?? 0) > 0,
    hasViewedRecap: isDmRoleForQueries && (recapRes.count ?? 0) > 0,
  };

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
    methodology_milestone_toast: tm("milestone_toast", { count: 0 }),
    methodology_milestone_link: tm("milestone_link"),
    methodology_researcher_title: tm("researcher_title"),
    methodology_researcher_subtitle: tm("researcher_subtitle", { count: 0 }),
    methodology_researcher_link: tm("researcher_link"),
    campaign_joined_success: t("campaign_joined_success"),
    // JO-09: Player empty state
    player_empty_title: t("player_empty_title"),
    player_empty_desc: t("player_empty_desc"),
    player_empty_code_placeholder: t("player_empty_code_placeholder"),
    player_empty_code_submit: t("player_empty_code_submit"),
    player_empty_explore: t("player_empty_explore"),
    player_empty_try: t("player_empty_try"),
    // JO-10: Active session
    session_live: t("session_live"),
    session_join: t("session_join"),
    // JO-13: Activation checklist
    checklist_title: t("checklist_title"),
    checklist_progress: t("checklist_progress"),
    checklist_dismiss: t("checklist_dismiss"),
    checklist_account: t("checklist_account"),
    checklist_combat: t("checklist_combat"),
    checklist_invite: t("checklist_invite"),
    checklist_legendary: t("checklist_legendary"),
    checklist_recap: t("checklist_recap"),
    checklist_all_complete: t("checklist_all_complete"),
    // Player checklist
    player_checklist_title: tpc("title"),
    player_checklist_progress: tpc("progress", { done: 0, total: 0 }),
    player_checklist_dismiss: tpc("dismiss"),
    player_checklist_account: tpc("item_account"),
    player_checklist_campaign: tpc("item_campaign"),
    player_checklist_character: tpc("item_character"),
    player_checklist_session: tpc("item_session"),
    player_checklist_all_complete: tpc("all_complete"),
    player_checklist_cta_invites: tpc("cta_invites"),
    player_checklist_cta_campaigns: tpc("cta_campaigns"),
    player_checklist_cta_waiting: tpc("cta_waiting"),
  };

  // Player checklist data — built from results of parallel wave above
  const playerChecklistStatus = {
    hasAccount: true,
    hasCampaign: playerMemberships.length > 0,
    hasCharacter: shouldQueryPlayerChecklist && (playerCharRes.count ?? 0) > 0,
    hasAttendedSession: shouldQueryPlayerChecklist && (playerSessionRes.count ?? 0) > 0,
  };

  // XP: Weekly streak bonus — pre-check cooldown to avoid wasting 3+ queries on every render
  if (streakWeeks >= 2) {
    const weekStart = getCooldownStart("week");
    const { count } = await supabase
      .from("xp_ledger")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action_key", "dm_streak_weekly")
      .gte("created_at", weekStart);
    if ((count ?? 0) === 0) {
      grantXpAsync(user.id, "dm_streak_weekly", "dm", { streak_weeks: streakWeeks });
    }
  }

  return (
    <div>
      <GuestDataImportModal />
      {/* C3 fix: wrap the "Continue where you left off" card in Suspense so
          the skeleton streams on first paint. Previously the query ran inside
          the page-level Promise.all, which meant the skeleton was never
          rendered (the server blocked returning JSX until the query resolved).
          The server component below owns its own query. */}
      <Suspense fallback={<ContinueFromLastSessionSkeleton />}>
        <ContinueFromLastSessionServer />
      </Suspense>
      <DashboardOverview
        campaigns={campaigns}
        savedEncounters={savedEncounters}
        userId={user.id}
        userRole={userRole}
        memberships={memberships}
        pendingInvites={finalPendingInvites}
        translations={translations}
        streakWeeks={streakWeeks}
        hasUsedCombat={hasUsedCombat}
        checklistStatus={checklistStatus}
        playerChecklistStatus={playerChecklistStatus}
      />
    </div>
  );
}
