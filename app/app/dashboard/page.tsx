export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { GuestDataImportModal } from "@/components/dashboard/GuestDataImportModal";
import type { SavedEncounterRow } from "@/components/dashboard/SavedEncounters";
import type { UserRole } from "@/lib/stores/role-store";

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
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const userRole = (userData?.role as UserRole) ?? "both";

  // Onboarding redirect — new DMs with no campaigns go through the wizard
  // Players skip onboarding since they don't create campaigns
  if (userRole !== "player") {
    const { count, error: countErr } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);

    if (!countErr && count === 0) redirect("/app/onboarding");
  }

  // Fetch campaigns with player character count
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

  // Fetch active/saved encounters for resume (Story 3-10)
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
        translations={translations}
      />
    </div>
  );
}
