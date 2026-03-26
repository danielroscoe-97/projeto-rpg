export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CampaignManager } from "@/components/dashboard/CampaignManager";
import { SavedEncounters } from "@/components/dashboard/SavedEncounters";
import { Swords, Package } from "lucide-react";
import type { SavedEncounterRow } from "@/components/dashboard/SavedEncounters";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Onboarding redirect — new DMs with no campaigns go through the wizard
  const { count, error: countErr } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (!countErr && count === 0) redirect("/app/onboarding");

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

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4 relative">
        <div className="absolute -right-2 -top-2 hidden sm:block" aria-hidden="true">
          <Image src="/art/icons/pet-deviruchi.png" alt="" width={48} height={48} className="pixel-art opacity-20 float-gentle" unoptimized />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("description")}
          </p>
        </div>
        <Link
          href="/app/session/new"
          className="inline-flex items-center gap-2 bg-gold text-surface-primary font-semibold px-3 py-1.5 rounded-lg text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[36px] shrink-0"
        >
          <Swords className="inline-block w-4 h-4" aria-hidden="true" /> {t("new_session")}
        </Link>
      </div>
      <SavedEncounters encounters={savedEncounters} />

      {/* Presets quick-access */}
      <div className="mb-6">
        <Link
          href="/app/presets"
          className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 hover:border-white/20 transition-colors group"
        >
          <Package className="w-5 h-5 text-muted-foreground group-hover:text-gold transition-colors" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground">{t("presets_title")}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {presetCount ?? 0} {t("presets_count")}
            </span>
          </div>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{t("presets_manage")}</span>
        </Link>
      </div>

      <CampaignManager initialCampaigns={campaigns} userId={user.id} />
    </div>
  );
}
