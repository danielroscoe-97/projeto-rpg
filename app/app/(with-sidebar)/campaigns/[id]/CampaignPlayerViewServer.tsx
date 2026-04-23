import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { PlayerCampaignView } from '@/components/campaign/PlayerCampaignView'
import { getCampaignMembers } from '@/lib/supabase/campaign-membership'
import { ActiveCombatBanner } from '@/components/campaign/ActiveCombatBanner'

interface CampaignPlayerViewServerProps {
  campaignId: string
  campaignName: string
  ownerId: string
  userId: string
}

/**
 * Async server component for the player campaign view.
 *
 * B04 perf: extracted from the page shell so the shell can stream this child
 * via <Suspense> instead of blocking on all queries before any render.
 */
export async function CampaignPlayerViewServer({
  campaignId,
  campaignName,
  ownerId,
  userId,
}: CampaignPlayerViewServerProps) {
  const supabase = await createClient()

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
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('player_characters')
      .select('id, name, current_hp, max_hp')
      .eq('campaign_id', campaignId)
      .neq('user_id', userId)
      .order('name'),
    supabase
      .from('sessions')
      .select('id, name, is_active')
      .eq('campaign_id', campaignId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('sessions')
      .select('id')
      .eq('campaign_id', campaignId),
    supabase
      .from('users')
      .select('display_name')
      .eq('id', ownerId)
      .maybeSingle(),
    getCampaignMembers(campaignId),
  ])

  // Fetch active encounter if session exists (depends on activeSession)
  let activeEncounter: { round_number: number; current_turn_name: string | null; name: string | null } | null = null
  let activeJoinToken: string | null = null
  if (activeSession) {
    const [{ data: enc }, { data: tokenRow }] = await Promise.all([
      supabase
        .from('encounters')
        .select('round_number, name')
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('session_tokens')
        .select('token')
        .eq('session_id', activeSession.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
    ])
    if (enc) {
      activeEncounter = {
        round_number: enc.round_number ?? 0,
        current_turn_name: null,
        name: (enc.name as string | null | undefined) ?? null,
      }
    }
    activeJoinToken = (tokenRow?.token as string | undefined) ?? null
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
    <div className="space-y-4">
      <ActiveCombatBanner
        campaignId={campaignId}
        userId={userId}
        initialSessionId={activeEncounter ? (activeSession?.id ?? null) : null}
        initialJoinToken={activeJoinToken}
        initialEncounterName={activeEncounter?.name ?? null}
      />
      <PlayerCampaignView
      campaignId={campaignId}
      campaignName={campaignName}
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
        character_id: m.character_id ?? null,
        role: m.role,
      }))}
      currentUserId={userId}
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
        createCharacter: t("create_character_cta"),
        createCharacterDesc: t("create_character_desc"),
      }}
    />
    </div>
  )
}
