import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { PlayerCharacterManager } from '@/components/dashboard/PlayerCharacterManager'

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!campaign) redirect('/app/dashboard')

  const { data: characters } = await supabase
    .from('player_characters')
    .select('*')
    .eq('campaign_id', id)
    .order('created_at', { ascending: true })

  const t = await getTranslations("dashboard");

  return (
    <div>
      <div className="mb-6">
        <Link href="/app/dashboard" className="text-muted-foreground text-sm hover:text-foreground transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]">
          {t("back_to_dashboard")}
        </Link>
        <h1 className="text-2xl font-semibold text-foreground mt-2">{campaign.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("manage_players_description")}</p>
      </div>
      <PlayerCharacterManager
        initialCharacters={characters ?? []}
        campaignId={campaign.id}
        campaignName={campaign.name}
      />
    </div>
  )
}
