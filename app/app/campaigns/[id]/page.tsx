import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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

  return (
    <div>
      <div className="mb-6">
        <Link href="/app/dashboard" className="text-white/50 text-sm hover:text-white">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-semibold text-white mt-2">{campaign.name}</h1>
        <p className="text-white/50 text-sm mt-1">Manage player characters for this campaign.</p>
      </div>
      <PlayerCharacterManager
        initialCharacters={characters ?? []}
        campaignId={campaign.id}
        campaignName={campaign.name}
      />
    </div>
  )
}
