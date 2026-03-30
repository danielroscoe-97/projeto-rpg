import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { CampaignSections } from './CampaignSections'
import { PlayerCampaignView } from '@/components/campaign/PlayerCampaignView'
import { getCampaignMembership } from '@/lib/supabase/campaign-membership'

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

    // Fetch combat history (finished encounters)
    let combatHistory: { id: string; name: string; round_number: number }[] = []
    if (historySessions && historySessions.length > 0) {
      const sessionIds = historySessions.map(s => s.id)
      const { data: encounters } = await supabase
        .from('encounters')
        .select('id, name, round_number')
        .in('session_id', sessionIds)
        .eq('is_active', false)
        .order('updated_at', { ascending: false })
        .limit(10)
      combatHistory = (encounters ?? []).map(e => ({
        id: e.id,
        name: e.name ?? t("encounter_fallback"),
        round_number: e.round_number ?? 0,
      }))
    }

    return (
      <PlayerCampaignView
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
        activeSession={activeSession ? {
          id: activeSession.id,
          name: activeSession.name ?? t("session_fallback"),
          round_number: activeEncounter?.round_number ?? null,
          current_turn_name: activeEncounter?.current_turn_name ?? null,
        } : null}
        combatHistory={combatHistory}
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
          noCombatHistory: t("no_combat_history"),
          activeSession: tDash("active_session"),
          noActiveSession: tDash("no_active_session"),
          levelLabel: t("level_label"),
          dmLabel: t("dm_label"),
          acLabel: t("ac_label"),
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
  ])

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

  const t = await getTranslations("campaign")
  const tDash = await getTranslations("dashboard")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/app/dashboard"
            className="text-muted-foreground text-sm hover:text-foreground transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          >
            {tDash("back_to_dashboard")}
          </Link>
          <h1 className="text-2xl font-semibold text-foreground mt-2">{campaign.name}</h1>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border">
          <span className="text-amber-400 text-sm font-semibold">{playerCount ?? 0}</span>
          <span className="text-muted-foreground text-sm">{t("summary_players")}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border">
          <span className="text-amber-400 text-sm font-semibold">{sessionCount ?? 0}</span>
          <span className="text-muted-foreground text-sm">{t("summary_sessions")}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-border">
          <span className="text-amber-400 text-sm font-semibold">{finishedEncounterCount}</span>
          <span className="text-muted-foreground text-sm">{t("summary_encounters")}</span>
        </div>
      </div>

      {/* Collapsible Sections */}
      <CampaignSections
        campaignId={campaign.id}
        campaignName={campaign.name}
        initialCharacters={characters ?? []}
      />
    </div>
  )
}
