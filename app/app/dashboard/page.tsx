export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { GuestDataImportModal } from "@/components/dashboard/GuestDataImportModal";
import type { SavedEncounterRow } from "@/components/dashboard/SavedEncounters";
import type { UserRole } from "@/lib/stores/role-store";
import {
  getUserMemberships,
  getPendingInvites,
} from "@/lib/supabase/campaign-membership";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
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

  // Fetch memberships (dual-role: DM + Player campaigns) — needed before onboarding check
  const memberships = await getUserMemberships(user.id);

  // Onboarding redirect — new DMs with no campaigns go through the wizard
  // Skip if user already has any memberships (as player or DM)
  if (userRole !== "player" && memberships.length === 0) {
    const { count, error: countErr } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);

    if (!countErr && count === 0) redirect("/app/onboarding");
  }

  // Fetch pending invites
  const pendingInvites = await getPendingInvites(userEmail);

  // Fetch campaigns owned by user (for CampaignManager backward compat)
  const { data: rawCampaigns } = await supabase
    .from("campaigns")
    .select("id, name, created_at, player_characters(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const campaigns = (rawCampaigns ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    created_at: c.created_at as string,
    player_count:
      (c.player_characters as { count: number }[])[0]?.count ?? 0,
  }));

  // Fetch active/saved encounters for resume
  const { data: rawEncounters } = await supabase
    .from("encounters")
    .select("id, name, round_number, is_active, updated_at, session_id, sessions!inner(id, name, owner_id)")
    .eq("sessions.owner_id", user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(10);

  // Fetch preset count for quick-access card
  const { count: presetCount } = await supabase
    .from("monster_presets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

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
    presets_title: t("presets_title"),
    presets_count: t("presets_count"),
    presets_manage: t("presets_manage"),
    player_welcome: t("player_welcome"),
    player_join_hint: t("player_join_hint"),
    dm_tables_title: t("dm_tables_title"),
    player_tables_title: t("player_tables_title"),
    pending_invites: t("pending_invites"),
    quick_combat: t("quick_combat"),
    create_first_campaign: t("create_first_campaign"),
    create_first_campaign_desc: t("create_first_campaign_desc"),
    waiting_for_invite: t("waiting_for_invite"),
    waiting_for_invite_desc: t("waiting_for_invite_desc"),
    try_quick_combat: t("try_quick_combat"),
    active_session: t("active_session"),
    no_active_session: t("no_active_session"),
    tab_dm: t("tab_dm"),
    tab_player: t("tab_player"),
    invited_by: t("invited_by"),
    accept_invite: t("accept_invite"),
    decline_invite: t("decline_invite"),
    invite_accept_error: t("invite_accept_error"),
    invite_decline_error: t("invite_decline_error"),
    invite_accepted_redirect: t("invite_accepted_redirect"),
    player_count_label: t("player_count_label", { count: "{count}" }),
  };

  return (
    <div>
      <GuestDataImportModal />
      <DashboardContent
        campaigns={campaigns}
        savedEncounters={savedEncounters}
        presetCount={presetCount ?? 0}
        userId={user.id}
        userRole={userRole}
        memberships={memberships}
        pendingInvites={pendingInvites}
        translations={translations}
      />
    </div>
  );
}
