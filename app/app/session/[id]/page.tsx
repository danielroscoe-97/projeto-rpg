import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { CombatSessionClient } from "@/components/session/CombatSessionClient";
import { ShareSessionButton } from "@/components/session/ShareSessionButton";
import { GMNotesSheet } from "@/components/session/GMNotesSheet";
import { FileShareButton } from "@/components/session/FileShareButton";
import type { Combatant } from "@/lib/types/combat";

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id: sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch session
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, name, ruleset_version")
    .eq("id", sessionId)
    .eq("owner_id", user.id)
    .single();

  if (sessionError || !session) notFound();

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
          "id, name, current_hp, max_hp, temp_hp, ac, spell_save_dc, initiative, initiative_order, conditions, ruleset_version, is_defeated, is_player, monster_id, display_name, monster_group_id, group_order, dm_notes, player_notes"
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
    is_player: row.is_player ?? false,
    monster_id: row.monster_id ?? null,
    token_url: null,
    creature_type: null,
    display_name: (row as Record<string, unknown>).display_name as string | null ?? null,
    monster_group_id: (row as Record<string, unknown>).monster_group_id as string | null ?? null,
    group_order: (row as Record<string, unknown>).group_order as number | null ?? null,
    dm_notes: row.dm_notes ?? '',
    player_notes: row.player_notes ?? '',
    player_character_id: (row as Record<string, unknown>).player_character_id as string | null ?? null,
  }));

  const t = await getTranslations("dashboard");

  return (
    <div className="relative">
      {/* Subtle RPG watermark */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
        <Image src="/art/decorations/hero-swordsman.png" alt="" width={200} height={300} className="pixel-art opacity-[0.03]" unoptimized />
      </div>

      {/* Session header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {encounter?.name ?? "Encounter"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {session.name} · Ruleset {session.ruleset_version}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FileShareButton sessionId={sessionId} />
          <GMNotesSheet sessionId={sessionId} userId={user.id} />
          <ShareSessionButton sessionId={sessionId} />
          <Link
            href="/app/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground/80 transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px] inline-flex items-center"
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
      />
    </div>
  );
}
