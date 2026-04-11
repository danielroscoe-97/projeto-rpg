"use client";

import { CampaignManager } from "@/components/dashboard/CampaignManager";
import { PlayerCampaignCard } from "@/components/dashboard/PlayerCampaignCard";
import { PendingInvites } from "@/components/dashboard/PendingInvites";
import type { UserRole } from "@/lib/stores/role-store";
import type {
  UserMembership,
  CampaignInviteWithDetails,
} from "@/lib/types/campaign-membership";

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
  pendingInvites: CampaignInviteWithDetails[];
  translations: {
    campaigns_title: string;
    dm_tables_title: string;
    player_tables_title: string;
    pending_invites: string;
    invited_by: string;
    accept_invite: string;
    decline_invite: string;
    invite_accept_error: string;
    invite_decline_error: string;
    invite_accepted_redirect: string;
    active_session: string;
    no_active_session: string;
    campaigns_players_singular: string;
    campaigns_players_plural: string;
    dm_label: string;
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
  pendingInvites,
  translations: t,
}: CampaignsPageClientProps) {
  const showDm = userRole !== "player";
  const showPlayer = playerMemberships.length > 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-foreground">
        {t.campaigns_title}
      </h1>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <PendingInvites
          initialInvites={pendingInvites}
          translations={{
            title: t.pending_invites,
            invitedBy: t.invited_by,
            accept: t.accept_invite,
            decline: t.decline_invite,
            acceptError: t.invite_accept_error,
            declineError: t.invite_decline_error,
            acceptedRedirect: t.invite_accepted_redirect,
          }}
        />
      )}

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
