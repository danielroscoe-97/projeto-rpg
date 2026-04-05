import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { CampaignSections } from './CampaignSections'
import { CampaignStatsBar } from '@/components/campaign/CampaignStatsBar'
import { aggregateCampaignStats } from '@/lib/utils/campaign-stats'
import { PlayerCampaignView } from '@/components/campaign/PlayerCampaignView'
import { CombatLaunchSheet } from '@/components/campaign/CombatLaunchSheet'
import { CampaignQuickActions } from '@/components/campaign/CampaignQuickActions'
import { Swords } from 'lucide-react'
import { getCampaignMembership, getCampaignMembers } from '@/lib/supabase/campaign-membership'
import { getSrdMonsters, toSlug } from '@/lib/srd/srd-data-server'

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // C.1: Check membership + campaign in parallel
  const [membership, { data: campaign }] = await Promise.all([
    getCampaignMembership(id, user.id),
    supabase
      .from('campaigns')
      .select('id, name, description, owner_id')
      .eq('id', id)
      .single(),
  ])

  if (!campaign) redirect('/app/dashboard')

  const isOwner = campaign.owner_id === user.id
  const role = membership?.role ?? (isOwner ? 'dm' : null)

  // No access: not a member AND not the owner
  if (!role) redirect('/app/dashboard')

  // ── Player View ──────────────────────────────────────────────────────────
  if (role === 'player') {
    // Parallelize independent queries
    const [
      { data: myCharacter },
      { data: companions },
      { data: activeSession },
      { data: historySessions },
      { data: dmUser },
      campaignMembers,
    ] = await Promise.all([
      supabase
        .from('player_characters')
        .select('id, name, current_hp, max_hp, ac, race, class, level')
        .eq('campaign_id', id)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('player_characters')
        .select('id, name, current_hp, max_hp')
        .eq('campaign_id', id)
        .neq('user_id', user.id)
        .order('name'),
      supabase
        .from('sessions')
        .select('id, name, is_active')
        .eq('campaign_id', id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('sessions')
        .select('id')
        .eq('campaign_id', id),
      supabase
        .from('users')
        .select('display_name')
        .eq('id', campaign.owner_id)
        .maybeSingle(),
      getCampaignMembers(id),
    ])

    // Fetch active encounter if session exists (depends on activeSession)
    let activeEncounter: { round_number: number; current_turn_name: string | null } | null = null
    if (activeSession) {
      const { data: enc } = await supabase
        .from('encounters')
        .select('round_number')
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (enc) {
        activeEncounter = { round_number: enc.round_number ?? 0, current_turn_name: null }
      }
    }

    const t = await getTranslations("campaign")
    const tDash = await getTranslations("dashboard")

    // Fetch combat history (finished encounters) with difficulty data
    let combatHistory: { id: string; name: string; round_number: number; difficulty_rating: number | null; updated_at: string }[] = []
    if (historySessions && historySessions.length > 0) {
      const sessionIds = historySessions.map(s => s.id)
      const { data: encounters } = await supabase
        .from('encounters')
        .select('id, name, round_number, difficulty_rating, updated_at')
        .in('session_id', sessionIds)
        .eq('is_active', false)
        .order('updated_at', { ascending: false })
        .limit(10)
      combatHistory = (encounters ?? []).map(e => ({
        id: e.id,
        name: e.name ?? t("encounter_fallback"),
        round_number: e.round_number ?? 0,
        difficulty_rating: e.difficulty_rating ?? null,
        updated_at: e.updated_at,
      }))
    }

    // F-42: Fetch player's existing votes for these encounters (server-side with auth context)
    let myVotes: Record<string, number> = {}
    if (combatHistory.length > 0) {
      const { getMyEncounterVotes } = await import("@/lib/supabase/encounter")
      const votesMap = await getMyEncounterVotes(supabase, combatHistory.map(e => e.id))
      myVotes = Object.fromEntries(votesMap)
    }

    return (
      <PlayerCampaignView
        campaignId={id}
        campaignName={campaign.name}
        dmName={dmUser?.display_name ?? null}
        myCharacter={myCharacter ? {
          id: myCharacter.id,
          name: myCharacter.name,
          current_hp: myCharacter.current_hp,
          max_hp: myCharacter.max_hp,
          ac: myCharacter.ac,
          race: myCharacter.race ?? null,
          characterClass: myCharacter.class ?? null,
          level: myCharacter.level ?? null,
        } : null}
        companions={(companions ?? []).map(c => ({
          id: c.id,
          name: c.name,
          current_hp: c.current_hp,
          max_hp: c.max_hp,
        }))}
        campaignMembers={(campaignMembers ?? []).map(m => ({
          user_id: m.user_id,
          display_name: m.display_name,
          character_name: m.character_name,
          role: m.role,
        }))}
        currentUserId={user.id}
        activeSession={activeSession ? {
          id: activeSession.id,
          name: activeSession.name ?? t("session_fallback"),
          round_number: activeEncounter?.round_number ?? null,
          current_turn_name: activeEncounter?.current_turn_name ?? null,
        } : null}
        combatHistory={combatHistory}
        myVotes={myVotes}
        translations={{
          back: tDash("back_to_dashboard"),
          myCharacter: t("my_character"),
          companions: t("companions"),
          combatHistory: t("combat_history"),
          enterSession: t("enter_session"),
          noCharacter: t("no_character"),
          noCharacterDesc: t("no_character_desc"),
          sessionActiveLabel: t("session_active_label"),
          sessionRound: t("session_round"),
          sessionCurrentTurn: t("session_current_turn"),
          combatRounds: t("combat_rounds"),
          noCompanions: t("no_companions"),
          companionsEmpty: t("companions_empty"),
          youBadge: t("you_badge"),
          noCombatHistory: t("no_combat_history"),
          activeSession: tDash("active_session"),
          noActiveSession: tDash("no_active_session"),
          levelLabel: t("level_label"),
          dmLabel: t("dm_label"),
          acLabel: t("ac_label"),
          loadMore: t("encounter_history_load_more"),
          quests: t("quests.title"),
          playerHq: t("player_hq_button"),
          rateThis: t("rate_this_encounter"),
          yourVote: t("your_vote"),
          voteAvg: t("vote_avg"),
          voteError: t("vote_error"),
        }}
      />
    )
  }

  // ── DM View (existing behavior) ──────────────────────────────────────────
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
  ] = await Promise.all([
    supabase
      .from('player_characters')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('player_characters')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id),
    supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id),
    supabase
      .from('sessions')
      .select('id')
      .eq('campaign_id', id),
    supabase
      .from('sessions')
      .select('id, name')
      .eq('campaign_id', id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    getCampaignMembers(id),
    supabase
      .from('campaign_npcs')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id),
    supabase
      .from('campaign_locations')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id),
    supabase
      .from('campaign_factions')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id),
    supabase
      .from('campaign_notes')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', id),
  ])

  // Get player emails for combat notifications
  const playerEmails = (initialMembers ?? [])
    .filter(m => m.role === 'player' && m.email)
    .map(m => m.email)

  // Count finished encounters across all sessions
  let finishedEncounterCount = 0
  if (dmSessions && dmSessions.length > 0) {
    const sessionIds = dmSessions.map(s => s.id)
    const { count } = await supabase
      .from('encounters')
      .select('*', { count: 'exact', head: true })
      .in('session_id', sessionIds)
      .eq('is_active', false)
    finishedEncounterCount = count ?? 0
  }

  // F5: Fetch combat reports for campaign stats
  const { data: campaignReports } = await supabase
    .from('combat_reports')
    .select('report_data')
    .eq('campaign_id', id)
  const campaignStats = aggregateCampaignStats(campaignReports ?? [])

  const t = await getTranslations("campaign")
  const tDash = await getTranslations("dashboard")

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/app/dashboard"
              className="text-muted-foreground text-sm hover:text-foreground transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            >
              {tDash("back_to_dashboard")}
            </Link>
            <h1 className="text-2xl font-semibold text-foreground mt-1">{campaign.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 rounded-lg">
              <span className="text-amber-400 text-sm font-semibold">{playerCount ?? 0}</span>
              <span className="text-muted-foreground text-xs">{t("summary_players", { count: playerCount ?? 0 })}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 rounded-lg">
              <span className="text-amber-400 text-sm font-semibold">{sessionCount ?? 0}</span>
              <span className="text-muted-foreground text-xs">{t("summary_sessions", { count: sessionCount ?? 0 })}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 rounded-lg">
              <span className="text-amber-400 text-sm font-semibold">{finishedEncounterCount}</span>
              <span className="text-muted-foreground text-xs">{t("summary_encounters", { count: finishedEncounterCount })}</span>
            </div>
            <CombatLaunchSheet
              campaignId={campaign.id}
              campaignName={campaign.name}
              playerEmails={playerEmails}
              activeSessionId={dmActiveSession?.id ?? null}
            >
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gold text-surface-primary hover:brightness-110 transition-all min-h-[44px]"
              >
                <Swords className="w-4 h-4" />
                {t("new_combat_button")}
              </button>
            </CombatLaunchSheet>
          </div>
        </div>

        {/* Active Session Banner */}
        {dmActiveSession && (
          <CombatLaunchSheet
            campaignId={campaign.id}
            campaignName={campaign.name}
            playerEmails={playerEmails}
            activeSessionId={dmActiveSession.id}
          >
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 hover:bg-amber-500/25 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {t("active_session_banner")}: &quot;{dmActiveSession.name ?? t("session_fallback")}&quot; · {t("new_combat_button")}
            </button>
          </CombatLaunchSheet>
        )}

        {/* Quick Actions Row */}
        <CampaignQuickActions campaignId={campaign.id} />
      </div>

      {/* Campaign Stats (F5) — only shows if >= 2 reports */}
      <CampaignStatsBar stats={campaignStats} />

      {/* 2-Column Sections */}
      <CampaignSections
        campaignId={campaign.id}
        campaignName={campaign.name}
        initialCharacters={characters ?? []}
        isOwner={isOwner}
        userId={user.id}
        initialMembers={initialMembers}
        sectionCounts={{
          npcs: npcCount ?? 0,
          locations: locationCount ?? 0,
          factions: factionCount ?? 0,
          notes: noteCount ?? 0,
        }}
        srdMonsters={isOwner ? getSrdMonsters().map((m) => ({
          name: m.name,
          cr: m.cr,
          type: m.type,
          slug: toSlug(m.name),
          token_url: m.token_url ?? null,
          source: m.source === 'mad' || m.source === 'MAD' ? 'mad'
            : m.ruleset_version === '2024' ? 'srd-2024' : 'srd',
        })) : undefined}
      />
    </div>
  )
}
