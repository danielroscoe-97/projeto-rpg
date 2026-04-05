export const dynamic = "force-dynamic";

import { createClient as createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { PlayerJoinClient } from "@/components/player/PlayerJoinClient";
import { SrdInitializer } from "@/components/srd/SrdInitializer";
import { getHpStatus } from "@/lib/utils/hp-status";
import type { Plan } from "@/lib/types/subscription";

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params;
  const t = await getTranslations("player");
  // Use service client to bypass RLS — the player has no auth session yet
  // (anonymous sign-in happens client-side in PlayerJoinClient)
  const supabase = createServiceClient();

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
          <h1 className="text-foreground text-xl font-semibold">{t("session_not_found")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("session_not_found_detail")}
          </p>
        </div>
      </div>
    );
  }

  // Verify session is active
  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, is_active, ruleset_version, dm_plan, campaign_id")
    .eq("id", tokenRow.session_id)
    .eq("is_active", true)
    .single();

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <h1 className="text-foreground text-xl font-semibold">{t("session_ended")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("session_ended_detail")}
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
    current_hp?: number;
    max_hp?: number;
    temp_hp?: number;
    ac?: number;
    initiative_order: number | null;
    conditions: string[];
    is_defeated: boolean;
    is_player: boolean;
    monster_id: string | null;
    ruleset_version: string | null;
    hp_status?: string;
  }> = [];

  if (encounter) {
    const { data: combatantRows } = await supabase
      .from("combatants")
      .select(
        "id, name, current_hp, max_hp, temp_hp, ac, initiative_order, conditions, is_defeated, is_player, is_hidden, monster_id, ruleset_version"
      )
      .eq("encounter_id", encounter.id)
      .order("initiative_order", { ascending: true });

    // Filter hidden combatants and strip sensitive monster stats — players only see HP status label
    combatants = (combatantRows ?? [])
      .filter((c) => !c.is_hidden)
      .map((c) => {
        if (c.is_player) {
          const { is_hidden: _h, ...rest } = c;
          return rest;
        }
        const { current_hp: _current_hp, max_hp: _max_hp, temp_hp: _temp_hp, ac: _ac, is_hidden: _h, ...safe } = c;
        return { ...safe, hp_status: getHpStatus(_current_hp, _max_hp) };
      });
  }

  // Auto-join: detect authenticated user with characters in this campaign
  let prefilledCharacters: Array<{
    id: string;
    name: string;
    max_hp: number;
    current_hp: number;
    ac: number;
    spell_save_dc: number | null;
    spell_slots?: Record<string, { max: number; used: number }> | null;
  }> = [];
  // campaignId is passed to PlayerJoinClient to enable the shared notes panel
  // Only set for authenticated campaign members — anonymous players get undefined
  let campaignId: string | undefined;

  try {
    // Check if user is authenticated (may not be — anonymous players skip this)
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (user) {
      const sessionCampaignId = session.campaign_id as string | null;

      if (sessionCampaignId) {
        campaignId = sessionCampaignId;

        // Find player's characters in this campaign
        const { data: characters } = await supabase
          .from("player_characters")
          .select("id, name, max_hp, current_hp, ac, spell_save_dc, spell_slots")
          .eq("campaign_id", sessionCampaignId)
          .eq("user_id", user.id);

        prefilledCharacters = characters ?? [];
      }
    }
  } catch {
    // Auth check failed — continue as anonymous (standard empty form)
  }

  const dmPlan = (["free","pro","mesa"].includes(session.dm_plan) ? session.dm_plan : "free") as Plan;

  // Fetch already-registered player names for this session (enables rejoin without cookies)
  // Include last_seen_at to determine active/inactive status for DM-approval flow
  const { data: registeredTokens } = await supabase
    .from("session_tokens")
    .select("player_name, last_seen_at")
    .eq("session_id", session.id)
    .eq("is_active", true)
    .not("player_name", "is", null);

  const ACTIVE_THRESHOLD_MS = 45_000; // 45s — more responsive presence detection
  const now = Date.now();

  const registeredPlayerNames = (registeredTokens ?? [])
    .map((t) => t.player_name!)
    .filter(Boolean);

  const registeredPlayersWithStatus = (registeredTokens ?? [])
    .filter((t) => t.player_name)
    .map((t) => ({
      name: t.player_name!,
      isActive: t.last_seen_at
        ? now - new Date(t.last_seen_at).getTime() < ACTIVE_THRESHOLD_MS
        : false,
      lastSeenAt: t.last_seen_at ?? null,
    }));

  return (
    <>
    <SrdInitializer />
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
      prefilledCharacters={prefilledCharacters}
      dmPlan={dmPlan}
      registeredPlayerNames={registeredPlayerNames}
      registeredPlayersWithStatus={registeredPlayersWithStatus}
      campaignId={campaignId}
      sessionCampaignId={(session.campaign_id as string | null) ?? undefined}
    />
    </>
  );
}
