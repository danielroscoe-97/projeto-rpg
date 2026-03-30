"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Swords, Zap, ChevronRight } from "lucide-react";

import { PendingInvites } from "@/components/dashboard/PendingInvites";
import { PlayerCampaignCard } from "@/components/dashboard/PlayerCampaignCard";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { CombatHistoryCard } from "@/components/dashboard/CombatHistoryCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { useRoleStore } from "@/lib/stores/role-store";
import { Button } from "@/components/ui/button";
import type { UserRole, ActiveView } from "@/lib/stores/role-store";
import type { SavedEncounterRow } from "@/components/dashboard/SavedEncounters";
import type {
  UserMembership,
  CampaignInviteWithDetails,
} from "@/lib/types/campaign-membership";

interface DashboardOverviewProps {
  campaigns: {
    id: string;
    name: string;
    created_at: string;
    player_count: number;
  }[];
  savedEncounters: SavedEncounterRow[];
  userId: string;
  userRole: UserRole;
  memberships: UserMembership[];
  pendingInvites: CampaignInviteWithDetails[];
  translations: {
    title: string;
    description: string;
    new_session: string;
    dm_tables_title: string;
    player_tables_title: string;
    pending_invites: string;
    quick_combat: string;
    waiting_for_invite: string;
    waiting_for_invite_desc: string;
    try_quick_combat: string;
    active_session: string;
    no_active_session: string;
    invited_by: string;
    accept_invite: string;
    decline_invite: string;
    invite_accept_error: string;
    invite_decline_error: string;
    invite_accepted_redirect: string;
    player_count_label: string;
    dm_label: string;
    encounters_round: string;
    encounters_in_progress: string;
    campaigns_players_plural: string;
    campaigns_manage: string;
    quick_actions: string;
    new_combat: string;
    create_npc: string;
    invite_player: string;
    view_all: string;
    dm_empty_title: string;
    dm_empty_desc: string;
    dm_empty_cta: string;
    combats_empty_title: string;
    combats_empty_cta: string;
  };
}

export function DashboardOverview({
  campaigns,
  savedEncounters,
  userId,
  userRole,
  memberships,
  pendingInvites,
  translations: t,
}: DashboardOverviewProps) {
  const { activeView, initialized, loadRole } = useRoleStore();

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  const dmMemberships = memberships.filter((m) => m.role === "dm");
  const playerMemberships = memberships.filter((m) => m.role === "player");
  const hasDmCampaigns = dmMemberships.length > 0 || campaigns.length > 0;
  const hasPlayerCampaigns = playerMemberships.length > 0;

  const effectiveView: ActiveView = initialized
    ? activeView
    : userRole === "player"
      ? "player"
      : "dm";

  const isDmFirst = effectiveView === "dm";
  const isDmRole = userRole !== "player";

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4" data-testid="dashboard-overview">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">{t.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t.description}</p>
        </div>
        {hasDmCampaigns && (
          <div className="flex items-center sm:justify-end">
            <Link
              href="/app/session/new"
              data-tour-id="dash-new-session"
              className="inline-flex items-center justify-center gap-2 bg-gold text-surface-primary font-semibold px-6 py-1.5 rounded-lg text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[36px] w-full sm:w-auto sm:min-w-[240px] shrink-0"
            >
              <Swords className="inline-block w-4 h-4" aria-hidden="true" />{" "}
              {t.new_session}
            </Link>
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="mb-6">
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
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-8" data-testid="quick-actions">
        <QuickActions
          translations={{
            quick_actions: t.quick_actions,
            new_combat: t.new_combat,
            create_npc: t.create_npc,
            invite_player: t.invite_player,
          }}
          campaignId={campaigns[0]?.id}
        />
      </div>

      {/* Active Campaigns Summary */}
      {isDmFirst ? (
        <>
          {hasDmCampaigns && (
            <OverviewDmSection campaigns={campaigns} t={t} />
          )}
          {hasPlayerCampaigns && (
            <OverviewPlayerSection playerMemberships={playerMemberships} t={t} />
          )}
        </>
      ) : (
        <>
          {hasPlayerCampaigns && (
            <OverviewPlayerSection playerMemberships={playerMemberships} t={t} />
          )}
          {hasDmCampaigns && (
            <OverviewDmSection campaigns={campaigns} t={t} />
          )}
        </>
      )}

      {/* No campaigns at all — show different empty state based on role */}
      {!hasDmCampaigns && !hasPlayerCampaigns && (
        isDmRole ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center" data-testid="dm-empty-state">
            <Image
              src="/art/icons/carta.png"
              alt=""
              width={64}
              height={64}
              className="pixel-art opacity-40 float-gentle"
              aria-hidden="true"
              unoptimized
            />
            <p className="text-foreground text-base font-medium">
              {t.dm_empty_title}
            </p>
            <p className="text-muted-foreground/70 text-sm">{t.dm_empty_desc}</p>
            <Button variant="gold" className="mt-2 min-h-[44px]" asChild>
              <Link href="/app/onboarding">{t.dm_empty_cta}</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-center" data-testid="player-empty-state">
            <Image
              src="/art/icons/pet-cat.png"
              alt=""
              width={64}
              height={64}
              className="pixel-art opacity-40 float-gentle"
              aria-hidden="true"
              unoptimized
            />
            <p className="text-muted-foreground text-sm font-medium">
              {t.waiting_for_invite}
            </p>
            <p className="text-muted-foreground/60 text-xs">{t.waiting_for_invite_desc}</p>
            <Button variant="gold" className="mt-2 min-h-[44px]" asChild>
              <Link href="/app/session/new">{t.try_quick_combat}</Link>
            </Button>
          </div>
        )
      )}

      {/* Recent Combats */}
      <div className="mt-8 space-y-3" data-testid="recent-combats">
        {savedEncounters.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t.quick_combat}
              </h2>
              <Link
                href="/app/dashboard/combats"
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1"
              >
                {t.view_all} <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {savedEncounters.slice(0, 3).map((enc) => (
                <CombatHistoryCard
                  key={enc.session_id}
                  combat={enc}
                  translations={{
                    round: t.encounters_round,
                    in_progress: t.encounters_in_progress,
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center rounded-lg border border-border bg-white/[0.02]" data-testid="combats-empty-state">
            <Image
              src="/art/icons/potion.png"
              alt=""
              width={40}
              height={40}
              className="pixel-art opacity-30"
              aria-hidden="true"
              unoptimized
            />
            <p className="text-muted-foreground/70 text-sm">{t.combats_empty_title}</p>
            <Button variant="goldOutline" size="sm" asChild>
              <Link href="/app/session/new">{t.combats_empty_cta}</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Quick Combat Link */}
      <div className="mt-8">
        <Link
          href="/app/session/new"
          className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 hover:border-white/20 transition-colors group"
        >
          <Zap className="w-5 h-5 text-amber-400 group-hover:text-gold transition-colors" />
          <span className="text-sm font-medium text-foreground flex-1">
            {t.quick_combat}
          </span>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            &rarr;
          </span>
        </Link>
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function OverviewDmSection({
  campaigns,
  t,
}: {
  campaigns: DashboardOverviewProps["campaigns"];
  t: DashboardOverviewProps["translations"];
}) {
  // Show up to 4 campaigns on overview
  const displayCampaigns = campaigns.slice(0, 4);

  return (
    <div className="mb-8 space-y-3" data-testid="dm-campaigns" data-tour-id="dash-campaigns">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <span aria-hidden="true">⚔️</span>
          {t.dm_tables_title}
        </h2>
        {campaigns.length > 4 && (
          <Link
            href="/app/dashboard/campaigns"
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1"
          >
            {t.view_all} <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayCampaigns.map((c) => (
          <CampaignCard
            key={c.id}
            campaign={c}
            translations={{
              players: t.campaigns_players_plural,
              manage: t.campaigns_manage,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function OverviewPlayerSection({
  playerMemberships,
  t,
}: {
  playerMemberships: UserMembership[];
  t: DashboardOverviewProps["translations"];
}) {
  return (
    <div className="mb-8 space-y-3" data-testid="player-campaigns">
      <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
        <span aria-hidden="true">🎭</span>
        {t.player_tables_title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {playerMemberships.slice(0, 4).map((m) => (
          <PlayerCampaignCard
            key={m.campaign_id}
            membership={m}
            translations={{
              activeSession: t.active_session,
              noActiveSession: t.no_active_session,
              playerCount: t.player_count_label,
              dmLabel: t.dm_label,
            }}
          />
        ))}
      </div>
    </div>
  );
}
