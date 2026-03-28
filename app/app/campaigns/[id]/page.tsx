import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { CampaignSections } from './CampaignSections'

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, description')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!campaign) redirect('/app/dashboard')

  const [
    { data: characters },
    { count: playerCount },
    { count: sessionCount },
    { data: sessions },
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
  if (sessions && sessions.length > 0) {
    const sessionIds = sessions.map(s => s.id)
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
