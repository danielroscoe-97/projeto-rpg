"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Swords, Zap, ChevronRight, ArrowRight, Users } from "lucide-react";
import { motion } from "framer-motion";

import { toast } from "sonner";
import { joinCampaignDirectAction } from "@/app/app/dashboard/actions";
import { InvitePlayersBanner } from "@/components/dashboard/InvitePlayersBanner";
import { StreakBadge } from "@/components/dashboard/StreakBadge";
import { PocketDmLabBadge } from "@/components/dashboard/PocketDmLabBadge";
import { MethodologyMilestoneToast } from "@/components/dashboard/MethodologyMilestoneToast";
import { ResearcherBadge } from "@/components/dashboard/ResearcherBadge";
import { XpCard } from "@/components/xp/XpCard";
import { PendingInvites } from "@/components/dashboard/PendingInvites";
import { PlayerCampaignCard } from "@/components/dashboard/PlayerCampaignCard";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { CombatHistoryCard } from "@/components/dashboard/CombatHistoryCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ActivationChecklist } from "@/components/dashboard/ActivationChecklist";
import type { ChecklistStatus } from "@/components/dashboard/ActivationChecklist";
import { PlayerActivationChecklist } from "@/components/dashboard/PlayerActivationChecklist";
import type { PlayerChecklistStatus } from "@/components/dashboard/PlayerActivationChecklist";
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
    cover_image_url?: string | null;
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
    campaigns_players_singular: string;
    campaigns_players_plural: string;
    dm_label: string;
    encounters_round: string;
    encounters_in_progress: string;
    campaigns_manage: string;
    quick_actions: string;
    new_combat: string;
    create_npc: string;
    invite_player: string;
    ongoing_combats: string;
    npc_dialog_title: string;
    npc_global_title: string;
    npc_global_desc: string;
    npc_for_campaign: string;
    npc_created_success: string;
    invite_dialog_title: string;
    no_campaigns_yet: string;
    no_campaigns_create: string;
    no_campaigns_cta: string;
    npc_global_badge: string;
    view_all: string;
    dm_empty_title: string;
    dm_empty_desc: string;
    dm_empty_cta: string;
    dm_empty_title_v2: string;
    dm_empty_desc_v2: string;
    dm_empty_cta_campaign: string;
    dm_empty_cta_quick: string;
    dm_nudge_invite: string;
    dm_nudge_invite_desc: string;
    combats_empty_title: string;
    combats_empty_cta: string;
    methodology_milestone_toast: string;
    methodology_milestone_link: string;
    methodology_lab_tooltip: string;
    methodology_researcher_title: string;
    methodology_researcher_subtitle: string;
    campaign_joined_success: string;
    methodology_researcher_link: string;
    // Player checklist
    player_checklist_title: string;
    player_checklist_progress: string;
    player_checklist_dismiss: string;
    player_checklist_account: string;
    player_checklist_campaign: string;
    player_checklist_character: string;
    player_checklist_session: string;
    player_checklist_all_complete: string;
    player_checklist_cta_invites: string;
    player_checklist_cta_campaigns: string;
    player_checklist_cta_waiting: string;
    // JO-09: Player empty state
    player_empty_title: string;
    player_empty_desc: string;
    player_empty_code_placeholder: string;
    player_empty_code_submit: string;
    player_empty_explore: string;
    player_empty_try: string;
    // JO-10: Active session
    session_live: string;
    session_join: string;
    // JO-13: Activation checklist
    checklist_title: string;
    checklist_progress: string;
    checklist_dismiss: string;
    checklist_account: string;
    checklist_combat: string;
    checklist_invite: string;
    checklist_legendary: string;
    checklist_recap: string;
    checklist_all_complete: string;
  };
  streakWeeks?: number;
  hasUsedCombat?: boolean;
  checklistStatus?: ChecklistStatus;
  playerChecklistStatus?: PlayerChecklistStatus;
}

export function DashboardOverview({
  campaigns,
  savedEncounters,
  userId,
  userRole,
  memberships,
  pendingInvites,
  translations: t,
  streakWeeks = 0,
  hasUsedCombat = false,
  checklistStatus,
  playerChecklistStatus,
}: DashboardOverviewProps) {
  const router = useRouter();
  const { activeView, initialized, loadRole } = useRoleStore();
  const [playerCode, setPlayerCode] = useState("");

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  // JO-01/JO-02/JO-04: Safety net — redirect to pending invite/join if localStorage has saved tokens
  useEffect(() => {
    let mounted = true; // S1-EC-01: cleanup flag for async IIFE

    try {
      const pendingInvite = localStorage.getItem("pendingInvite");
      if (pendingInvite) {
        const parsed = JSON.parse(pendingInvite) as { path: string; savedAt?: number };
        // S1-EC-02: Enforce 24h TTL — stale invite tokens should not fire
        const isStale = parsed.savedAt != null && Date.now() - parsed.savedAt > 86_400_000;
        if (isStale) {
          localStorage.removeItem("pendingInvite");
        } else if (parsed.path) {
          localStorage.removeItem("pendingInvite");
          router.push(parsed.path);
          return () => { mounted = false; };
        }
      }

      // P2-06: pendingJoinCode now stored as JSON with savedAt; handle both old
      // (plain string) and new (JSON) formats for backward compatibility.
      const pendingJoinCodeRaw = localStorage.getItem("pendingJoinCode");
      if (pendingJoinCodeRaw) {
        localStorage.removeItem("pendingJoinCode");
        let joinCode = pendingJoinCodeRaw;
        let joinCodeSavedAt: number | undefined;
        try {
          const parsed = JSON.parse(pendingJoinCodeRaw) as { code: string; savedAt?: number };
          joinCode = parsed.code;
          joinCodeSavedAt = parsed.savedAt;
        } catch {
          // plain string (old format) — no TTL, use as-is
        }
        const joinCodeStale = joinCodeSavedAt != null && Date.now() - joinCodeSavedAt > 86_400_000;
        if (!joinCodeStale && joinCode) {
          router.push(`/join-campaign/${joinCode}`);
          return () => { mounted = false; };
        }
      }

      // JO-04: Auto-join campaign after post-combat sign-up
      const pendingCampaignJoin = localStorage.getItem("pendingCampaignJoin");
      if (pendingCampaignJoin) {
        localStorage.removeItem("pendingCampaignJoin");
        const { campaignId: pendingCampaignId, playerName, sessionId: pendingSessionId } = JSON.parse(pendingCampaignJoin) as {
          campaignId: string;
          playerName?: string;
          sessionId?: string; // P1-01: passed to server action for validation
        };
        if (pendingCampaignId) {
          (async () => {
            try {
              const result = await joinCampaignDirectAction(pendingCampaignId, playerName, pendingSessionId);
              if (mounted && result.success && !result.alreadyMember) {
                toast.success(t.campaign_joined_success);
                router.refresh();
              }
            } catch {
              // Best-effort — DM can still send join code
            }
          })();
        }
      }
    } catch {
      // localStorage unavailable or corrupt — continue to dashboard
    }

    return () => { mounted = false; };
  }, [router, t.campaign_joined_success]);

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
  // JO-11: player with no campaigns + pending invites → show invites at absolute top
  const isPlayerWaitingForCampaign = !isDmRole && !hasPlayerCampaigns;
  const showInvitesAtTop = isPlayerWaitingForCampaign && pendingInvites.length > 0;

  const pendingInvitesBlock = (
    <div data-tour-id="dash-pending-invites">
      <PendingInvites
        initialInvites={pendingInvites}
        highlighted={showInvitesAtTop}
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
  );

  return (
    <>
      {/* Methodology milestone toast — fires once per milestone */}
      {isDmRole && (
        <MethodologyMilestoneToast
          toastMessage={t.methodology_milestone_toast}
          linkText={t.methodology_milestone_link}
        />
      )}

      {/* JO-11: Pending invites at top for player with no campaigns */}
      {showInvitesAtTop && (
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {pendingInvitesBlock}
        </motion.div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4" data-testid="dashboard-overview">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{t.title}</h1>
            <StreakBadge weeks={streakWeeks} />
            {isDmRole && <PocketDmLabBadge tooltip={t.methodology_lab_tooltip} />}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">{t.description}</p>
        </div>
        {hasDmCampaigns && isDmRole && (
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

      {/* JO-13: Activation Checklist — DM/both role */}
      {isDmRole && checklistStatus && (
        <ActivationChecklist
          status={checklistStatus}
          translations={{
            title: t.checklist_title,
            progress: t.checklist_progress,
            dismiss: t.checklist_dismiss,
            item_account: t.checklist_account,
            item_combat: t.checklist_combat,
            item_invite: t.checklist_invite,
            item_legendary: t.checklist_legendary,
            item_recap: t.checklist_recap,
            all_complete: t.checklist_all_complete,
          }}
        />
      )}

      {/* Player Activation Checklist */}
      {!isDmRole && playerChecklistStatus && (
        <PlayerActivationChecklist
          status={playerChecklistStatus}
          translations={{
            title: t.player_checklist_title,
            progress: t.player_checklist_progress,
            dismiss: t.player_checklist_dismiss,
            item_account: t.player_checklist_account,
            item_campaign: t.player_checklist_campaign,
            item_character: t.player_checklist_character,
            item_session: t.player_checklist_session,
            all_complete: t.player_checklist_all_complete,
            cta_invites: t.player_checklist_cta_invites,
            cta_campaigns: t.player_checklist_cta_campaigns,
            cta_waiting: t.player_checklist_cta_waiting,
          }}
        />
      )}

      {/* Pending Invites — standard position (player with campaigns, or DM) */}
      {!showInvitesAtTop && pendingInvites.length > 0 && (
        <div className="mb-6">
          {pendingInvitesBlock}
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
            npc_dialog_title: t.npc_dialog_title,
            npc_global_title: t.npc_global_title,
            npc_global_desc: t.npc_global_desc,
            npc_for_campaign: t.npc_for_campaign,
            npc_created_success: t.npc_created_success,
            invite_dialog_title: t.invite_dialog_title,
            no_campaigns_yet: t.no_campaigns_yet,
            no_campaigns_create: t.no_campaigns_create,
            no_campaigns_cta: t.no_campaigns_cta,
            npc_global_badge: t.npc_global_badge,
            campaigns_players_plural: t.campaigns_players_plural,
            campaigns_players_singular: t.campaigns_players_singular,
          }}
          campaigns={campaigns}
          userRole={userRole}
        />
      </div>

      {/* Researcher Badge — easter egg for DMs with 10+ rated combats */}
      {isDmRole && (
        <div className="mb-6">
          <ResearcherBadge
            userId={userId}
            title={t.methodology_researcher_title}
            subtitle={t.methodology_researcher_subtitle}
            linkText={t.methodology_researcher_link}
          />
        </div>
      )}

      {/* XP Rank Card */}
      <div className="mb-6">
        <XpCard userRole={userRole} />
      </div>

      {/* Invite Players Banner — show when DM has campaigns with characters but no linked players */}
      {isDmRole && campaigns.some((c) => c.player_count > 0) && playerMemberships.length === 0 && (
        <InvitePlayersBanner
          campaignsWithPlayers={campaigns.filter((c) => c.player_count > 0).length}
        />
      )}

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

      {/* No campaigns at all — show different empty state based on role (JO-07) */}
      {!hasDmCampaigns && !hasPlayerCampaigns && (
        isDmRole ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center" data-testid="dm-empty-state">
            <Image
              src="/art/icons/carta.png"
              alt=""
              width={96}
              height={96}
              className="pixel-art opacity-70 float-gentle"
              aria-hidden="true"
              unoptimized
            />
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              {t.dm_empty_title_v2}
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              {t.dm_empty_desc_v2}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full max-w-xs">
              <Button variant="gold" className="flex-1 min-h-[44px]" asChild>
                <Link href="/app/onboarding">{t.dm_empty_cta_campaign}</Link>
              </Button>
              <Button variant="goldOutline" className="flex-1 min-h-[44px]" asChild>
                <Link href="/try">{t.dm_empty_cta_quick}</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-10 text-center" data-testid="player-empty-state">
            <Image
              src="/art/icons/pet-cat.png"
              alt=""
              width={96}
              height={96}
              className="pixel-art opacity-50 float-gentle"
              aria-hidden="true"
              unoptimized
            />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">{t.player_empty_title}</h2>
              <p className="text-muted-foreground text-sm max-w-xs">{t.player_empty_desc}</p>
            </div>
            {/* Campaign code input */}
            <form
              className="flex gap-2 w-full max-w-xs"
              onSubmit={(e) => {
                e.preventDefault();
                const code = playerCode.trim().replace(/[^a-zA-Z0-9_-]/g, "");
                if (code) router.push(`/join-campaign/${encodeURIComponent(code)}`);
              }}
            >
              <input
                type="text"
                value={playerCode}
                onChange={(e) => setPlayerCode(e.target.value)}
                placeholder={t.player_empty_code_placeholder}
                className="flex-1 min-h-[44px] px-3 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50"
              />
              <Button type="submit" variant="gold" className="min-h-[44px] px-4 shrink-0">
                {t.player_empty_code_submit}
              </Button>
            </form>
            {/* Separator */}
            <div className="flex items-center gap-3 w-full max-w-xs text-muted-foreground/30 text-xs">
              <div className="flex-1 border-t border-current" />
              <span>ou</span>
              <div className="flex-1 border-t border-current" />
            </div>
            {/* Secondary links */}
            <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground/60">
              <Link href="/app/compendium" className="hover:text-amber-400 transition-colors inline-flex items-center gap-1">
                {t.player_empty_explore} <ArrowRight className="w-3 h-3" />
              </Link>
              <Link href="/try" className="hover:text-amber-400 transition-colors inline-flex items-center gap-1">
                {t.player_empty_try} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )
      )}

      {/* DM nudge: has campaigns but never used combat and no players registered (JO-07) */}
      {isDmRole && hasDmCampaigns && !hasUsedCombat && campaigns.every((c) => c.player_count === 0) && (
        <div className="mb-6 p-4 rounded-lg border border-gold/20 bg-gold/[0.04] flex items-start gap-3" data-testid="dm-nudge-invite">
          <Users className="w-8 h-8 text-amber-400/70 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t.dm_nudge_invite}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.dm_nudge_invite_desc}</p>
          </div>
        </div>
      )}

      {/* Recent Combats */}
      <div className="mt-8 space-y-3" data-testid="recent-combats">
        {savedEncounters.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t.ongoing_combats}
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
              players_singular: t.campaigns_players_singular,
              players_plural: t.campaigns_players_plural,
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
  // JO-10: sort campaigns with active sessions first
  const sorted = [...playerMemberships].sort((a, b) => (b.active_sessions ?? 0) - (a.active_sessions ?? 0));

  return (
    <div className="mb-8 space-y-3" data-testid="player-campaigns" data-tour-id="dash-player-campaigns">
      <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
        <span aria-hidden="true">🎭</span>
        {t.player_tables_title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.slice(0, 4).map((m) => (
          <PlayerCampaignCard
            key={m.campaign_id}
            membership={m}
            translations={{
              activeSession: t.active_session,
              noActiveSession: t.no_active_session,
              playersSingular: t.campaigns_players_singular,
              playersPlural: t.campaigns_players_plural,
              dmLabel: t.dm_label,
              sessionLive: t.session_live,
              sessionJoin: t.session_join,
            }}
          />
        ))}
      </div>
    </div>
  );
}
