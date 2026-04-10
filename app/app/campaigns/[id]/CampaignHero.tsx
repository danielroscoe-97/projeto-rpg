"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Swords, Plus, FileText, UserCircle, CalendarDays, UserPlus, Play } from "lucide-react";
import { CampaignPlayerAvatars } from "@/components/campaign/CampaignPlayerAvatars";
import { CampaignStatusCards } from "@/components/campaign/CampaignStatusCards";
import { CombatLaunchSheet } from "@/components/campaign/CombatLaunchSheet";
import { InvitePlayerDialog } from "@/components/campaign/InvitePlayerDialog";
import { SessionPlanner } from "@/components/campaign/SessionPlanner";
import { NextSessionCard } from "@/components/campaign/NextSessionCard";
import { CampaignHealthBadge } from "@/components/campaign/CampaignHealthBadge";
import { useCampaignMembershipListener } from "@/hooks/use-campaign-membership-listener";
import { calculateCampaignHealth } from "@/lib/utils/campaign-health";
import type { PlayerCharacter } from "@/lib/types/database";
import type { PlannedSession } from "@/lib/types/campaign-hub";

interface CampaignHeroProps {
  campaignId: string;
  campaignName: string;
  characters: PlayerCharacter[];
  playerEmails: string[];
  playerCount: number;
  sessionCount: number;
  questCount: number;
  finishedEncounterCount: number;
  activeSessionId: string | null;
  activeSessionName: string | null;
  lastSessionDate: string | null;
  nextPlannedSession?: PlannedSession | null;
  noteCount?: number;
  npcCount?: number;
}

export function CampaignHero({
  campaignId,
  campaignName,
  characters,
  playerEmails,
  playerCount,
  sessionCount,
  questCount,
  finishedEncounterCount,
  activeSessionId,
  activeSessionName,
  lastSessionDate,
  nextPlannedSession,
  noteCount = 0,
  npcCount = 0,
}: CampaignHeroProps) {
  const t = useTranslations("campaign");
  const router = useRouter();
  const [combatOpen, setCombatOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);

  // Realtime: listen for new member joins
  const { newMemberIds } = useCampaignMembershipListener({
    campaignId,
  });

  // Campaign health calculation
  const health = calculateCampaignHealth({
    playerCount,
    encounterCount: finishedEncounterCount,
    sessionCount,
    noteCount,
    npcCount,
    lastSessionDate,
  });

  const subtitle = (() => {
    if (activeSessionId) {
      return t("hub_subtitle_session", { number: sessionCount });
    }
    if (lastSessionDate) {
      const daysAgo = Math.floor(
        (Date.now() - new Date(lastSessionDate).getTime()) / 86400000,
      );
      if (daysAgo === 0) return t("hub_subtitle_last_today");
      return t("hub_subtitle_last", { days: daysAgo });
    }
    if (sessionCount > 0) {
      return t("hub_subtitle_session", { number: sessionCount });
    }
    return t("hub_subtitle_new");
  })();

  // Determine primary CTA based on campaign state
  const primaryAction = (() => {
    if (activeSessionId) return "active_session" as const;
    if (playerCount === 0) return "invite_players" as const;
    if (finishedEncounterCount === 0 && playerCount > 0) return "create_encounter" as const;
    if (sessionCount === 0 && finishedEncounterCount > 0) return "start_session" as const;
    return "default" as const;
  })();

  return (
    <div className="bg-card border border-white/[0.04] rounded-xl p-4 space-y-3">
      {/* Title + Session Status */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {campaignName}
        </h1>
        {/* Session-first subtitle */}
        {activeSessionId ? (
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-sm font-medium text-amber-400">
              {t("hero_session_active", { name: activeSessionName ?? "" })}
            </p>
          </div>
        ) : nextPlannedSession ? (
          <p className="text-sm text-emerald-400 mt-0.5">
            {t("hero_session_next", { name: nextPlannedSession.name })}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Player Avatars */}
      <CampaignPlayerAvatars
        characters={characters}
        campaignId={campaignId}
        onInvite={() => setInviteOpen(true)}
        newMemberIds={newMemberIds}
      />

      {/* Session-First Hero Content */}
      {activeSessionId ? (
        // Active session — show enter button prominently
        <button
          type="button"
          onClick={() => setCombatOpen(true)}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-400/15">
            <Play className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">{t("hero_enter_session")}</p>
            <p className="text-xs text-muted-foreground">{activeSessionName}</p>
          </div>
        </button>
      ) : nextPlannedSession ? (
        // Planned session — show session card
        <NextSessionCard
          session={nextPlannedSession}
          onStart={() => {
            router.push(`/app/session/${nextPlannedSession.id}`);
          }}
        />
      ) : null}

      {/* Campaign Health — subtle, below session info */}
      {(playerCount > 0 || sessionCount > 0) && (
        <CampaignHealthBadge health={health} mode="expanded" />
      )}

      {/* KPI Cards — secondary position */}
      <CampaignStatusCards
        campaignId={campaignId}
        playerCount={playerCount}
        sessionCount={sessionCount}
        questCount={questCount}
        finishedEncounterCount={finishedEncounterCount}
        activeSessionId={activeSessionId}
        activeSessionName={activeSessionName}
        onOpenCombat={() => setCombatOpen(true)}
        onInvite={() => setInviteOpen(true)}
      />

      {/* Contextual Quick Actions — adapt based on campaign state */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.04]">
        {/* Primary CTA — highlighted based on state */}
        {primaryAction === "invite_players" && (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15 ring-1 ring-amber-500/20 transition-colors min-h-[44px]"
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-400" />
            {t("quick_action_invite")}
          </button>
        )}

        {primaryAction === "create_encounter" && (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15 ring-1 ring-amber-500/20 transition-colors min-h-[44px]"
            onClick={() => router.push("?section=encounters", { scroll: false })}
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            {t("quick_action_first_encounter")}
          </button>
        )}

        {primaryAction === "start_session" && !nextPlannedSession && (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15 ring-1 ring-amber-500/20 transition-colors min-h-[44px]"
            onClick={() => setPlannerOpen(true)}
          >
            <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
            {t("quick_action_first_session")}
          </button>
        )}

        {/* Standard actions — always visible for active campaigns */}
        {!nextPlannedSession && primaryAction === "default" && (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-colors min-h-[44px]"
            onClick={() => setPlannerOpen(true)}
          >
            <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
            {t("quick_action_plan_session")}
          </button>
        )}

        <button
          type="button"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-red-500/20 bg-red-500/5 text-red-300 hover:bg-red-500/10 hover:border-red-500/40 transition-colors min-h-[44px]"
          onClick={() => setCombatOpen(true)}
        >
          <Swords className="w-3.5 h-3.5 text-red-400" />
          {t("new_combat_button")}
        </button>

        {primaryAction !== "create_encounter" && (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/40 transition-colors min-h-[44px]"
            onClick={() =>
              router.push("?section=encounters", { scroll: false })
            }
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            {t("quick_action_encounter")}
          </button>
        )}

        <button
          type="button"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-300 hover:bg-blue-500/10 hover:border-blue-500/40 transition-colors min-h-[44px]"
          onClick={() =>
            router.push("?section=notes", { scroll: false })
          }
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          {t("quick_action_note")}
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/40 transition-colors min-h-[44px]"
          onClick={() =>
            router.push("?section=npcs", { scroll: false })
          }
        >
          <UserCircle className="w-3.5 h-3.5 text-purple-400" />
          {t("quick_action_npc")}
        </button>
      </div>

      {/* Single shared dialog instances */}
      <InvitePlayerDialog
        campaignId={campaignId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
      <CombatLaunchSheet
        campaignId={campaignId}
        campaignName={campaignName}
        playerEmails={playerEmails}
        activeSessionId={activeSessionId}
        plannedSessionName={nextPlannedSession?.name ?? null}
        plannedSessionId={nextPlannedSession?.id ?? null}
        open={combatOpen}
        onOpenChange={setCombatOpen}
      />
      <SessionPlanner
        campaignId={campaignId}
        open={plannerOpen}
        onOpenChange={setPlannerOpen}
        onSessionCreated={() => router.refresh()}
      />
    </div>
  );
}
