import { CampaignHero } from "@/app/app/(with-sidebar)/campaigns/[id]/CampaignHero";
import { BriefingStatusBadge } from "@/components/campaign/BriefingStatusBadge";
import { BriefingToday } from "@/components/campaign/BriefingToday";
import { BriefingActivityTimeline } from "@/components/campaign/BriefingActivityTimeline";
import { BriefingMindMapPreview } from "@/components/campaign/BriefingMindMapPreview";
import { BriefingPulseStats } from "@/components/campaign/BriefingPulseStats";
import type { PlayerCharacter } from "@/lib/types/database";
import type { PlannedSession } from "@/lib/types/campaign-hub";
import type {
  ActiveEncounterInfo,
  BriefingStatus,
  RecentActivityItem,
} from "@/lib/types/campaign-briefing";
import type { AggregatedCampaignStats } from "@/lib/utils/campaign-stats";

interface CampaignBriefingProps {
  campaignId: string;
  campaignName: string;
  userId: string;
  characters: PlayerCharacter[];
  playerEmails: string[];

  // Counts (for Hero + Pulse)
  playerCount: number;
  sessionCount: number;
  questCount: number;
  finishedEncounterCount: number;
  npcCount: number;
  locationCount: number;
  factionCount: number;
  noteCount: number;

  // Active/planned session
  activeSessionId: string | null;
  activeSessionName: string | null;
  activeEncounter: ActiveEncounterInfo | null;
  nextPlannedSession: PlannedSession | null;
  lastSessionDate: string | null;

  // Activity timeline
  recentActivity: RecentActivityItem[];

  // Combat stats for Pulse
  campaignStats: AggregatedCampaignStats;
}

/**
 * Derives the campaign briefing status (used by the status badge + halo) from
 * the session/encounter/time signals. See SPEC-campaign-dashboard-briefing §3.1.
 */
function resolveStatus({
  activeEncounter,
  activeSessionId,
  nextPlannedSession,
  lastSessionDate,
  sessionCount,
}: {
  activeEncounter: ActiveEncounterInfo | null;
  activeSessionId: string | null;
  nextPlannedSession: PlannedSession | null;
  lastSessionDate: string | null;
  sessionCount: number;
}): BriefingStatus {
  if (activeSessionId && activeEncounter) return "active_combat";
  if (activeSessionId) return "active_session";
  if (nextPlannedSession) return "planned_next";
  if (sessionCount === 0 && !lastSessionDate) return "new";
  return "paused";
}

/**
 * `<CampaignBriefing />` — DM-only briefing container
 * (SPEC-campaign-dashboard-briefing §3). Orchestrates:
 *
 *   1. Hero (evolution of `<CampaignHero briefingMode />`) with status badge slot
 *   2. "Hoje na sua mesa"          — <BriefingToday/>
 *   3. "Atividade recente"          — <BriefingActivityTimeline/>
 *   4. "Teia viva"                  — <BriefingMindMapPreview/> (client-side fetch)
 *   5. "Pulso da campanha"          — <BriefingPulseStats/> (health + stats)
 *
 * The container is a server component so the SSR payload is preserved; the
 * heavy mind map fetch is isolated inside its own client component and does
 * not block streaming.
 */
export function CampaignBriefing(props: CampaignBriefingProps) {
  const status = resolveStatus({
    activeEncounter: props.activeEncounter,
    activeSessionId: props.activeSessionId,
    nextPlannedSession: props.nextPlannedSession,
    lastSessionDate: props.lastSessionDate,
    sessionCount: props.sessionCount,
  });

  const statusContext =
    props.activeSessionName ?? props.nextPlannedSession?.name ?? null;

  return (
    <div className="space-y-8">
      <CampaignHero
        campaignId={props.campaignId}
        campaignName={props.campaignName}
        userId={props.userId}
        characters={props.characters}
        playerEmails={props.playerEmails}
        playerCount={props.playerCount}
        sessionCount={props.sessionCount}
        questCount={props.questCount}
        finishedEncounterCount={props.finishedEncounterCount}
        activeSessionId={props.activeSessionId}
        activeSessionName={props.activeSessionName}
        lastSessionDate={props.lastSessionDate}
        nextPlannedSession={props.nextPlannedSession}
        noteCount={props.noteCount}
        npcCount={props.npcCount}
        briefingMode
        titleSlot={
          <BriefingStatusBadge status={status} contextLabel={statusContext} />
        }
      />

      <BriefingToday
        campaignId={props.campaignId}
        campaignName={props.campaignName}
        userId={props.userId}
        playerEmails={props.playerEmails}
        activeSessionId={props.activeSessionId}
        activeSessionName={props.activeSessionName}
        activeEncounter={props.activeEncounter}
        nextPlannedSession={props.nextPlannedSession}
        lastSessionDate={props.lastSessionDate}
      />

      <BriefingActivityTimeline items={props.recentActivity} />

      <BriefingMindMapPreview campaignId={props.campaignId} />

      <BriefingPulseStats
        npcCount={props.npcCount}
        locationCount={props.locationCount}
        factionCount={props.factionCount}
        noteCount={props.noteCount}
        finishedEncounterCount={props.finishedEncounterCount}
        sessionCount={props.sessionCount}
        playerCount={props.playerCount}
        lastSessionDate={props.lastSessionDate}
        campaignStats={props.campaignStats}
      />
    </div>
  );
}
