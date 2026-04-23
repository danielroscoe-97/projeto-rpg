export const dynamic = "force-dynamic";

import { createClient as createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { PlayerJoinClient } from "@/components/player/PlayerJoinClient";
import { SrdInitializer } from "@/components/srd/SrdInitializer";
import { CommandPalette } from "@/components/oracle/CommandPalette";
import { FloatingCardContainer } from "@/components/oracle/FloatingCardContainer";
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

  // --- Phase 1: Validate token (must succeed before anything else) ---
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

  // --- Phase 2: Auth check (sequential to avoid lock contention with service client) ---
  // Creates a cookie-based server client; must not race with the service client's queries
  // to prevent Supabase auth lock stealing (was causing 35+ Sentry errors/day).
  const authUser = await createAuthClient()
    .then((c) => c.auth.getUser())
    .then(({ data }) => data.user)
    .catch(() => null);

  // --- Phase 3: Parallel fetch — session, encounter, registered players ---
  const [sessionResult, encounterResult, registeredTokensResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, name, is_active, ruleset_version, dm_plan, campaign_id")
      .eq("id", tokenRow.session_id)
      .eq("is_active", true)
      .single(),
    supabase
      .from("encounters")
      .select("id, round_number, current_turn_index, is_active")
      .eq("session_id", tokenRow.session_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("session_tokens")
      .select("player_name, last_seen_at")
      .eq("session_id", tokenRow.session_id)
      .eq("is_active", true)
      .not("player_name", "is", null),
  ]);

  const session = sessionResult.data;
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

  const encounter = encounterResult.data;
  const user = authUser;
  const registeredTokens = registeredTokensResult.data;

  // --- Phase 4: Parallel fetch — combatants + character pre-fill (both depend on phase 2/3) ---
  const combatantsPromise = encounter
    ? supabase
        .from("combatants")
        .select(
          "id, name, current_hp, max_hp, temp_hp, ac, initiative_order, conditions, is_defeated, is_player, is_hidden, monster_id, ruleset_version, legendary_actions_total, legendary_actions_used"
        )
        .eq("encounter_id", encounter.id)
        .order("initiative_order", { ascending: true })
        .then(({ data }) => data)
    : Promise.resolve(null);

  const sessionCampaignId = session.campaign_id as string | null;
  const charactersPromise = (user && sessionCampaignId)
    ? Promise.resolve(
        supabase
          .from("player_characters")
          .select("id, name, max_hp, current_hp, ac, spell_save_dc, spell_slots")
          .eq("campaign_id", sessionCampaignId)
          .eq("user_id", user.id)
      ).then(({ data }) => data).catch(() => null)
    : Promise.resolve(null);

  const [combatantRows, characters] = await Promise.all([combatantsPromise, charactersPromise]);

  // Filter hidden combatants and strip sensitive monster stats — players only see HP status label
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
    reaction_used: boolean;
    /** Party sees legendary action spend — decision 2026-04-23 */
    legendary_actions_total?: number | null;
    legendary_actions_used?: number;
  }> = [];

  if (combatantRows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase infers column types; cast is safe
    combatants = (combatantRows as any[])
      .filter((c) => !c.is_hidden)
      .map((c) => {
        if (c.is_player) {
          const { is_hidden: _h, ...rest } = c;
          return { ...rest, reaction_used: false };
        }
        const { current_hp, max_hp, temp_hp: _temp_hp, ac: _ac, is_hidden: _h, ...safe } = c;
        return { ...safe, hp_status: getHpStatus(current_hp ?? 0, max_hp ?? 0), reaction_used: false };
      });
  }

  const prefilledCharacters = characters ?? [];
  // campaignId is passed to PlayerJoinClient to enable the shared notes panel
  // Only set for authenticated campaign members — anonymous players get undefined
  const campaignId = (user && sessionCampaignId) ? sessionCampaignId : undefined;

  const dmPlan = (["free","pro","mesa"].includes(session.dm_plan) ? session.dm_plan : "free") as Plan;

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
    <CommandPalette />
    <FloatingCardContainer />
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
