import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { CombatSessionClient } from "@/components/session/CombatSessionClient";
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

  // Fetch the most recent encounter for this session
  const { data: encounter } = await supabase
    .from("encounters")
    .select("id, name, round_number, current_turn_index, is_active")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch combatants sorted by initiative_order
  const rawCombatants = encounter
    ? await supabase
        .from("combatants")
        .select(
          "id, name, current_hp, max_hp, temp_hp, ac, spell_save_dc, initiative, initiative_order, conditions, ruleset_version, is_defeated, is_player, monster_id"
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
  }));

  return (
    <div>
      {/* Session header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">
            {encounter?.name ?? "Encounter"}
          </h1>
          <p className="text-white/50 text-sm mt-0.5">
            {session.name} · Ruleset {session.ruleset_version}
          </p>
        </div>
        <Link
          href="/app/dashboard"
          className="text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Client component — manages initiative, combat state */}
      {encounter ? (
        <CombatSessionClient
          sessionId={sessionId}
          encounterId={encounter.id}
          initialCombatants={combatants}
          isActive={encounter.is_active ?? false}
          roundNumber={encounter.round_number ?? 1}
        />
      ) : (
        <p className="text-white/40 text-sm text-center mt-12">
          No encounter found for this session.
        </p>
      )}
    </div>
  );
}
