import { createClient } from "@/lib/supabase/server";
import { PlayerJoinClient } from "@/components/player/PlayerJoinClient";

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // Validate token
  const { data: tokenRow, error: tokenError } = await supabase
    .from("session_tokens")
    .select("id, session_id")
    .eq("token", token)
    .eq("is_active", true)
    .single();

  if (tokenError || !tokenRow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <h1 className="text-foreground text-xl font-semibold">Session Not Found</h1>
          <p className="text-muted-foreground text-sm">
            Session not found or has ended. Ask your DM for a new link.
          </p>
        </div>
      </div>
    );
  }

  // Verify session is active
  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, is_active, ruleset_version")
    .eq("id", tokenRow.session_id)
    .eq("is_active", true)
    .single();

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <h1 className="text-foreground text-xl font-semibold">Session Ended</h1>
          <p className="text-muted-foreground text-sm">
            This session has ended. Ask your DM for a new link.
          </p>
        </div>
      </div>
    );
  }

  // Fetch active encounter + combatants
  const { data: encounter } = await supabase
    .from("encounters")
    .select("id, round_number, current_turn_index, is_active")
    .eq("session_id", session.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let combatants: Array<{
    id: string;
    name: string;
    current_hp: number;
    max_hp: number;
    temp_hp: number;
    ac: number;
    initiative_order: number | null;
    conditions: string[];
    is_defeated: boolean;
    is_player: boolean;
    monster_id: string | null;
    ruleset_version: string | null;
  }> = [];

  if (encounter) {
    const { data: combatantRows } = await supabase
      .from("combatants")
      .select(
        "id, name, current_hp, max_hp, temp_hp, ac, initiative_order, conditions, is_defeated, is_player, monster_id, ruleset_version"
      )
      .eq("encounter_id", encounter.id)
      .order("initiative_order", { ascending: true });

    combatants = combatantRows ?? [];
  }

  return (
    <PlayerJoinClient
      tokenId={tokenRow.id}
      sessionId={session.id}
      sessionName={session.name}
      rulesetVersion={session.ruleset_version}
      encounterId={encounter?.id ?? null}
      isActive={encounter?.is_active ?? false}
      roundNumber={encounter?.round_number ?? 0}
      currentTurnIndex={encounter?.current_turn_index ?? 0}
      initialCombatants={combatants}
    />
  );
}
