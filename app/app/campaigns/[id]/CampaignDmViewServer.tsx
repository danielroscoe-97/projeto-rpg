import { createClient } from '@/lib/supabase/server'
import { aggregateCampaignStats } from '@/lib/utils/campaign-stats'
import { getCampaignMembers } from '@/lib/supabase/campaign-membership'
import { getCampaignRecentActivity } from '@/lib/supabase/campaign-briefing'
import { getSrdMonsters, toSlug } from '@/lib/srd/srd-data-server'
import { CampaignBriefing } from '@/components/campaign/CampaignBriefing'
import { CampaignHero } from './CampaignHero'
import { CampaignOnboardingChecklist } from '@/components/campaign/CampaignOnboardingChecklist'
import { CampaignFocusView } from './CampaignFocusView'
import { CampaignHeroCompact } from '@/components/campaign/CampaignHeroCompact'
import { CampaignNavBar } from '@/components/campaign/CampaignNavBar'
import { CampaignSidebarIndex } from '@/components/campaign/CampaignSidebarIndex'
import { ActiveCombatBanner } from '@/components/campaign/ActiveCombatBanner'
import { CombatTimeline, CombatTimelineSkeleton } from '@/components/campaign/CombatTimeline'
import { Suspense } from 'react'
import type { SectionId } from '@/lib/types/campaign-hub'

interface CampaignDmViewServerProps {
  campaignId: string
  campaignName: string
  isOwner: boolean
  userId: string
  activeSection: SectionId | null
}

/**
 * Async server component holding the heavy DM-view data fetching + render.
 *
 * B04 perf: by moving this out of the page shell and wrapping it in <Suspense>,
 * the outer page can render its shell (auth check + redirects) immediately and
 * stream this payload down as its 13+ queries resolve. FCP should improve from
 * ~6-8s to ~1-2s on slow connections.
 */
export async function CampaignDmViewServer({
  campaignId,
  campaignName,
  isOwner,
  userId,
  activeSection,
}: CampaignDmViewServerProps) {
  const supabase = await createClient()

  const [
    { data: characters },
    { count: playerCount },
    { count: sessionCount },
    { data: dmSessions },
    { data: dmActiveSession },
    initialMembers,
    { count: npcCount },
    { count: locationCount },
    { count: factionCount },
    { count: noteCount },
    { count: questCount },
    { data: nextPlannedSessionData },
    { data: campaignSettingsData },
    recentActivity,
  ] = await Promise.all([
    supabase
      .from('player_characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true }),
    supabase
      .from('player_characters')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId),
    supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId),
    supabase
      .from('sessions')
      .select('id, updated_at')
      .eq('campaign_id', campaignId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('sessions')
      .select('id, name')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    getCampaignMembers(campaignId),
    supabase
      .from('campaign_npcs')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId),
    supabase
      .from('campaign_locations')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId),
    supabase
      .from('campaign_factions')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId),
    supabase
      .from('campaign_notes')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId),
    supabase
      .from('campaign_quests')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId),
    supabase
      .from('sessions')
      .select('id, name, description, scheduled_for, session_number, status')
      .eq('campaign_id', campaignId)
      .eq('status', 'planned')
      .order('scheduled_for', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('campaign_settings')
      .select('onboarding_completed')
      .eq('campaign_id', campaignId)
      .maybeSingle(),
    getCampaignRecentActivity(supabase, campaignId, 5),
  ])

  const onboardingCompleted = campaignSettingsData?.onboarding_completed ?? false

  // Player emails for combat notifications
  const playerEmails = (initialMembers ?? [])
    .filter(m => m.role === 'player' && m.email)
    .map(m => m.email)

  // Finished encounters + campaign reports + active-encounter lookup in parallel —
  // all depend on results above but are independent from each other.
  const sessionIds = (dmSessions ?? []).map(s => s.id)
  const activeSessionId = dmActiveSession?.id ?? null
  const [finishedEncounterRes, campaignReportsRes, activeEncounterRes] = await Promise.all([
    sessionIds.length > 0
      ? supabase
          .from('encounters')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
          .eq('is_active', false)
      : Promise.resolve({ count: 0 } as const),
    supabase
      .from('combat_reports')
      .select('report_data')
      .eq('campaign_id', campaignId),
    activeSessionId
      ? supabase
          .from('encounters')
          .select('id, round_number, name')
          .eq('session_id', activeSessionId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null } as const),
  ])

  const finishedEncounterCount = finishedEncounterRes.count ?? 0
  const campaignStats = aggregateCampaignStats(campaignReportsRes.data ?? [])
  const activeEncounter = activeEncounterRes.data
    ? {
        id: activeEncounterRes.data.id,
        round_number: activeEncounterRes.data.round_number ?? null,
        name: activeEncounterRes.data.name ?? null,
      }
    : null

  // W5 (F19): server-side lookup of active session token for banner SSR.
  // Cheap single-row query; only when combat is live.
  let activeJoinToken: string | null = null
  if (activeSessionId && activeEncounter) {
    const { data: tokenRow } = await supabase
      .from('session_tokens')
      .select('token')
      .eq('session_id', activeSessionId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    activeJoinToken = (tokenRow?.token as string | undefined) ?? null
  }

  // SRD monsters for encounter builder (DM only, loaded from local bundle — fast, no await)
  const srdMonsters = isOwner ? getSrdMonsters().map((m) => ({
    name: m.name,
    cr: m.cr,
    type: m.type,
    slug: toSlug(m.name),
    token_url: m.token_url ?? null,
    source: m.source === 'mad' || m.source === 'MAD' ? 'mad'
      : m.ruleset_version === '2024' ? 'srd-2024' : 'srd',
  })) : undefined

  if (activeSection) {
    return (
      <>
        <CampaignHeroCompact
          campaignId={campaignId}
          campaignName={campaignName}
          characters={characters ?? []}
          activeSessionName={dmActiveSession?.name ?? null}
          sessionCount={sessionCount ?? 0}
        />
        <ActiveCombatBanner
          campaignId={campaignId}
          initialSessionId={activeEncounter ? activeSessionId : null}
          initialJoinToken={activeJoinToken}
          initialEncounterName={activeEncounter?.name ?? null}
        />
        <CampaignNavBar activeSection={activeSection} isOwner={isOwner} />
        <CampaignFocusView
          section={activeSection}
          campaignId={campaignId}
          campaignName={campaignName}
          isOwner={isOwner}
          userId={userId}
          characters={characters ?? []}
          initialMembers={initialMembers}
          srdMonsters={srdMonsters}
        />
      </>
    )
  }

  const nextPlannedSession = nextPlannedSessionData
    ? {
        id: nextPlannedSessionData.id,
        name: nextPlannedSessionData.name,
        description: nextPlannedSessionData.description ?? null,
        scheduled_for: nextPlannedSessionData.scheduled_for ?? null,
        session_number: nextPlannedSessionData.session_number ?? null,
        status: (nextPlannedSessionData.status as "planned") ?? "planned",
      }
    : null

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-8">
        <ActiveCombatBanner
          campaignId={campaignId}
          initialSessionId={activeEncounter ? activeSessionId : null}
          initialJoinToken={activeJoinToken}
          initialEncounterName={activeEncounter?.name ?? null}
        />
        {!onboardingCompleted ? (
          <>
            <CampaignHero
              campaignId={campaignId}
              campaignName={campaignName}
              userId={userId}
              characters={characters ?? []}
              playerEmails={playerEmails}
              playerCount={playerCount ?? 0}
              sessionCount={sessionCount ?? 0}
              questCount={questCount ?? 0}
              finishedEncounterCount={finishedEncounterCount}
              activeSessionId={activeSessionId}
              activeSessionName={dmActiveSession?.name ?? null}
              lastSessionDate={dmSessions?.[0]?.updated_at ?? null}
              nextPlannedSession={nextPlannedSession}
              noteCount={noteCount ?? 0}
              npcCount={npcCount ?? 0}
            />
            <CampaignOnboardingChecklist
              campaignId={campaignId}
              campaignName={campaignName}
              playerEmails={playerEmails}
              activeSessionId={activeSessionId}
              playerCount={playerCount ?? 0}
              encounterCount={finishedEncounterCount}
              sessionCount={sessionCount ?? 0}
            />
          </>
        ) : (
          <CampaignBriefing
            campaignId={campaignId}
            campaignName={campaignName}
            userId={userId}
            characters={characters ?? []}
            playerEmails={playerEmails}
            playerCount={playerCount ?? 0}
            sessionCount={sessionCount ?? 0}
            questCount={questCount ?? 0}
            finishedEncounterCount={finishedEncounterCount}
            npcCount={npcCount ?? 0}
            locationCount={locationCount ?? 0}
            factionCount={factionCount ?? 0}
            noteCount={noteCount ?? 0}
            activeSessionId={activeSessionId}
            activeSessionName={dmActiveSession?.name ?? null}
            activeEncounter={activeEncounter}
            nextPlannedSession={nextPlannedSession}
            lastSessionDate={dmSessions?.[0]?.updated_at ?? null}
            recentActivity={recentActivity}
            campaignStats={campaignStats}
          />
        )}
        {/* Epic 12 Story 12.6a — finished-combat history as a narrative timeline.
            Lives outside the onboarding-vs-briefing branch so it surfaces on EVERY
            campaign page (v1.0 bug: all real campaigns were in the onboarding
            branch and the timeline never rendered). The component has its own
            empty-state, so always rendering it is fine — it self-suppresses the
            visual weight when there's no history yet. Own Suspense boundary
            prevents the encounters query from blocking the rest of the page. */}
        <Suspense fallback={<CombatTimelineSkeleton />}>
          <CombatTimeline campaignId={campaignId} />
        </Suspense>
      </div>
      {/* Wiki-style sidebar index — hidden when new AppSidebar is enabled (it hosts this nav inline) */}
      {process.env.NEXT_PUBLIC_FEATURE_NEW_SIDEBAR !== "true" && (
        <CampaignSidebarIndex isOwner={isOwner} />
      )}
    </div>
  )
}
