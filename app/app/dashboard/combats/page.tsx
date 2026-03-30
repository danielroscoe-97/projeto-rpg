export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { CombatsPageClient } from "@/components/dashboard/CombatsPageClient";
import type { SavedEncounterRow } from "@/components/dashboard/SavedEncounters";

export default async function CombatsPage() {
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch all active/saved encounters (larger limit for the dedicated page)
  const { data: rawEncounters } = await supabase
    .from("encounters")
    .select("id, name, round_number, is_active, updated_at, session_id, sessions!inner(id, name, owner_id)")
    .eq("sessions.owner_id", user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(50);

  const savedEncounters: SavedEncounterRow[] = (rawEncounters ?? []).map((e) => ({
    session_id: e.session_id as string,
    encounter_name: (e.name ?? "Encounter") as string,
    session_name: ((e.sessions as unknown as Record<string, unknown>)?.name ?? "Session") as string,
    round_number: (e.round_number ?? 1) as number,
    is_active: (e.is_active ?? false) as boolean,
    updated_at: (e.updated_at ?? "") as string,
  }));

  const translations = {
    encounters_title: t("encounters_title"),
    encounters_empty: t("encounters_empty"),
    encounters_start_combat: t("encounters_start_combat"),
    encounters_round: t("encounters_round"),
    encounters_in_progress: t("encounters_in_progress"),
    new_session: t("new_session"),
  };

  return (
    <CombatsPageClient
      savedEncounters={savedEncounters}
      translations={translations}
    />
  );
}
