import { createClient, getAuthUser } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { CombatSessionClient } from "@/components/combat-session/CombatSessionClient";
import { ShareSessionButton } from "@/components/combat-session/ShareSessionButton";
import { AuthCombatTourProvider } from "@/components/tour/AuthCombatTourProvider";
import type { Combatant } from "@/lib/types/combat";

interface CombatPageProps {
  params: Promise<{ id: string }>;
}

export default async function CombatPage({ params }: CombatPageProps) {
  const { id: sessionId } = await params;
  const [user, supabase] = await Promise.all([getAuthUser(), createClient()]);
  if (!user) redirect("/auth/login");

  // Parallelize onboarding + session fetch (both only need user.id)
  const [onboardingRes, sessionRes] = await Promise.all([
    supabase
      .from("user_onboarding")
      .select("combat_tour_completed")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("id, name, ruleset_version, campaign_id")
      .eq("id", sessionId)
      .eq("owner_id", user.id)
      .single(),
  ]);

  const combatTourCompleted = (onboardingRes.data as { combat_tour_completed?: boolean } | null)?.combat_tour_completed ?? false;
  const session = sessionRes.data;
  if (sessionRes.error || !session) notFound();

  // Fetch the most recent encounter for this session (maybeSingle: zero rows = null, not error)
  const { data: encounter } = await supabase
    .from("encounters")
    .select("id, name, round_number, current_turn_index, is_active")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch combatants sorted by initiative_order
  const rawCombatants = encounter
    ? await supabase
        .from("combatants")
        .select(
          "id, name, current_hp, max_hp, temp_hp, ac, spell_save_dc, initiative, initiative_order, conditions, ruleset_version, is_defeated, is_hidden, is_player, monster_id, display_name, monster_group_id, group_order, dm_notes, player_notes, player_character_id, condition_durations, death_saves, legendary_actions_total, legendary_actions_used"
        )
        .eq("encounter_id", encounter.id)
        .order("initiative_order", { ascending: true })
        .then(({ data }) => data ?? [])
    : [];

  // Shape DB rows into Combatant type
  const combatants: Combatant[] = rawCombatants.map((row) => ({
    id: row.id,
    name: row.name,
    current_hp: row.current_hp,
    max_hp: row.max_hp,
    temp_hp: row.temp_hp ?? 0,
    ac: row.ac,
    spell_save_dc: row.spell_save_dc ?? null,
    initiative: row.initiative ?? null,
    initiative_order: row.initiative_order ?? null,
    conditions: row.conditions ?? [],
    ruleset_version: row.ruleset_version ?? null,
    is_defeated: row.is_defeated ?? false,
    is_hidden: row.is_hidden ?? false,
    is_player: row.is_player ?? false,
    monster_id: row.monster_id ?? null,
    token_url: null,
    creature_type: null,
    display_name: row.display_name ?? null,
    monster_group_id: row.monster_group_id ?? null,
    group_order: row.group_order ?? null,
    dm_notes: row.dm_notes ?? '',
    player_notes: row.player_notes ?? '',
    player_character_id: row.player_character_id ?? null,
    combatant_role: null,
    condition_durations: (row.condition_durations as Record<string, number> | null) ?? {},
    death_saves: (row.death_saves as { successes: number; failures: number } | null) ?? undefined,
    legendary_actions_total: row.legendary_actions_total ?? null,
    legendary_actions_used: row.legendary_actions_used ?? 0,
    reaction_used: false,
  }));

  const t = await getTranslations("dashboard");

  return (
    <div className="relative">
      {/* Subtle RPG watermark */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
        <Image src="/art/decorations/hero-swordsman.png" alt="" width={200} height={300} className="pixel-art opacity-[0.03]" unoptimized />
      </div>

      {/* Session header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="min-w-0 flex items-center gap-3">
          <Link href="/app/dashboard" className="shrink-0 opacity-80 hover:opacity-100 transition-opacity" aria-label="Pocket DM — Voltar ao Dashboard">
            <Image src="/art/brand/logo-icon.svg" alt="Pocket DM" width={28} height={28} unoptimized />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground truncate">
              {encounter?.name ?? "Encounter"}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {session.name} · Ruleset {session.ruleset_version}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ShareSessionButton sessionId={sessionId} />
          <Link
            href="/app/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground/80 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px] inline-flex items-center whitespace-nowrap"
            aria-label={t("back_to_dashboard")}
          >
            {t("back_to_dashboard")}
          </Link>
        </div>
      </div>

      {/* Client component — manages initiative, combat state */}
      <CombatSessionClient
        sessionId={sessionId}
        encounterId={encounter?.id ?? null}
        initialCombatants={combatants}
        isActive={encounter?.is_active ?? false}
        roundNumber={encounter?.round_number ?? 1}
        currentTurnIndex={encounter?.current_turn_index ?? 0}
        rulesetVersion={session.ruleset_version === "2024" ? "2024" : "2014"}
        campaignId={session.campaign_id ?? null}
      />

      {/* Authenticated combat tour — only during setup, NEVER during active combat */}
      <AuthCombatTourProvider shouldAutoStart={!combatTourCompleted && !(encounter?.is_active)} />
    </div>
  );
}
