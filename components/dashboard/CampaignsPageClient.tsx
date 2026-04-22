"use client";

import { CampaignManager } from "@/components/dashboard/CampaignManager";
import { PlayerCampaignCard } from "@/components/dashboard/PlayerCampaignCard";
import type { UserRole } from "@/lib/stores/role-store";
import type { UserMembership } from "@/lib/types/campaign-membership";

interface CampaignsPageClientProps {
  campaigns: {
    id: string;
    name: string;
    created_at: string;
    player_count: number;
    session_count?: number;
    note_count?: number;
    npc_count?: number;
    encounter_count?: number;
    last_session_date?: string | null;
    is_archived?: boolean;
  }[];
  userId: string;
  userRole: UserRole;
  playerMemberships: UserMembership[];
  translations: {
    campaigns_title: string;
    dm_tables_title: string;
    player_tables_title: string;
    active_session: string;
    no_active_session: string;
    campaigns_players_singular: string;
    campaigns_players_plural: string;
    dm_label: string;
    /** Epic 12 Story 12.7 — role chip on player-side cards. */
    campaigns_role_player: string;
    hp_full: string;
    hp_light: string;
    hp_moderate: string;
    hp_heavy: string;
    hp_critical: string;
  };
}

export function CampaignsPageClient({
  campaigns,
  userId,
  userRole,
  playerMemberships,
  translations: t,
}: CampaignsPageClientProps) {
  const showDm = userRole !== "player";
  const showPlayer = playerMemberships.length > 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-foreground">
        {t.campaigns_title}
      </h1>

      {/* DM Campaigns */}
      {showDm && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
            {t.dm_tables_title}
          </h2>
          <CampaignManager initialCampaigns={campaigns} userId={userId} />
        </div>
      )}

      {/* Player Campaigns */}
      {showPlayer && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
            {t.player_tables_title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {playerMemberships.map((m) => (
              <PlayerCampaignCard
                key={m.campaign_id}
                membership={m}
                translations={{
                  activeSession: t.active_session,
                  noActiveSession: t.no_active_session,
                  playersSingular: t.campaigns_players_singular,
                  playersPlural: t.campaigns_players_plural,
                  dmLabel: t.dm_label,
                  roleLabel: t.campaigns_role_player,
                  hp_full: t.hp_full,
                  hp_light: t.hp_light,
                  hp_moderate: t.hp_moderate,
                  hp_heavy: t.hp_heavy,
                  hp_critical: t.hp_critical,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
