import { createClient } from '@/lib/supabase/server'
import { CampaignStatsBar } from '@/components/campaign/CampaignStatsBar'
import { aggregateCampaignStats } from '@/lib/utils/campaign-stats'
import { getCampaignMembers } from '@/lib/supabase/campaign-membership'
import { getSrdMonsters, toSlug } from '@/lib/srd/srd-data-server'
import { CampaignHero } from './CampaignHero'
import { CampaignGrid } from './CampaignGrid'
import { CampaignOnboardingChecklist } from '@/components/campaign/CampaignOnboardingChecklist'
import { CampaignFocusView } from './CampaignFocusView'
import { CampaignHeroCompact } from '@/components/campaign/CampaignHeroCompact'
import { CampaignNavBar } from '@/components/campaign/CampaignNavBar'
import { CampaignSidebarIndex } from '@/components/campaign/CampaignSidebarIndex'
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
  ])

  const onboardingCompleted = campaignSettingsData?.onboarding_completed ?? false

  // Player emails for combat notifications
  const playerEmails = (initialMembers ?? [])
    .filter(m => m.role === 'player' && m.email)
    .map(m => m.email)

  // Finished encounters + campaign reports in parallel — both depend on results above
  // but are independent from each other, so batch into one wave.
  const sessionIds = (dmSessions ?? []).map(s => s.id)
  const [finishedEncounterRes, campaignReportsRes] = await Promise.all([
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
  ])

  const finishedEncounterCount = finishedEncounterRes.count ?? 0
  const campaignStats = aggregateCampaignStats(campaignReportsRes.data ?? [])

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

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-8">
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
          activeSessionId={dmActiveSession?.id ?? null}
          activeSessionName={dmActiveSession?.name ?? null}
          lastSessionDate={dmSessions?.[0]?.updated_at ?? null}
          nextPlannedSession={nextPlannedSessionData ? {
            id: nextPlannedSessionData.id,
            name: nextPlannedSessionData.name,
            description: nextPlannedSessionData.description ?? null,
            scheduled_for: nextPlannedSessionData.scheduled_for ?? null,
            session_number: nextPlannedSessionData.session_number ?? null,
            status: (nextPlannedSessionData.status as "planned") ?? "planned",
          } : null}
          noteCount={noteCount ?? 0}
          npcCount={npcCount ?? 0}
        />
        <CampaignStatsBar stats={campaignStats} />
        {!onboardingCompleted ? (
          <CampaignOnboardingChecklist
            campaignId={campaignId}
            campaignName={campaignName}
            playerEmails={playerEmails}
            activeSessionId={dmActiveSession?.id ?? null}
            playerCount={playerCount ?? 0}
            encounterCount={finishedEncounterCount}
            sessionCount={sessionCount ?? 0}
          />
        ) : (
          <CampaignGrid
            isOwner={isOwner}
            playerCount={playerCount ?? 0}
            npcCount={npcCount ?? 0}
            locationCount={locationCount ?? 0}
            factionCount={factionCount ?? 0}
            noteCount={noteCount ?? 0}
            questCount={questCount ?? 0}
            finishedEncounterCount={finishedEncounterCount}
          />
        )}
      </div>
      {/* Wiki-style sidebar index */}
      <CampaignSidebarIndex isOwner={isOwner} />
    </div>
  )
}
