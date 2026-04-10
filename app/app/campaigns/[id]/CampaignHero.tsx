"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Swords, Plus, FileText, UserCircle, CalendarDays } from "lucide-react";
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
  const tDash = useTranslations("dashboard");
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

  return (
    <div className="bg-card border border-white/[0.04] rounded-xl p-4 space-y-3">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {campaignName}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      {/* Player Avatars */}
      <CampaignPlayerAvatars
        characters={characters}
        campaignId={campaignId}
        onInvite={() => setInviteOpen(true)}
        newMemberIds={newMemberIds}
      />

      {/* Campaign Health — subtle progress bar */}
      {(playerCount > 0 || sessionCount > 0) && (
        <CampaignHealthBadge health={health} mode="expanded" />
      )}

      {/* Next Planned Session Card */}
      {nextPlannedSession && (
        <NextSessionCard
          session={nextPlannedSession}
          onStart={() => {
            router.push(`/app/session/${nextPlannedSession.id}`);
          }}
        />
      )}

      {/* Status KPI Cards — CombatLaunchSheet lives here, single instance */}
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

      {/* Quick Actions Row */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-white/[0.04]">
        {!nextPlannedSession && (
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
