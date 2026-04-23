import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import { getCampaignMembership } from '@/lib/supabase/campaign-membership'
import { CampaignViewTransition } from '@/components/campaign/CampaignViewTransition'
import { CampaignPageSkeleton, PlayerCampaignSkeleton } from '@/components/ui/skeletons/CampaignPageSkeleton'
import { CampaignDmViewServer } from './CampaignDmViewServer'
import { CampaignPlayerViewServer } from './CampaignPlayerViewServer'
import type { SectionId } from '@/lib/types/campaign-hub'

const VALID_SECTIONS: SectionId[] = ["sessions","encounters","quests","players","npcs","locations","factions","notes","inventory","mindmap","settings"]

/**
 * B04 perf fix:
 * - Outer page does only auth + membership/campaign check (2 queries, ~100-200ms)
 * - Heavy data fetching lives inside <Suspense>-wrapped async server components
 *   (CampaignDmViewServer / CampaignPlayerViewServer). The shell streams to
 *   the client while those children resolve, collapsing FCP/LCP from ~6-8s to ~1-2s.
 *
 * Parity: render logic unchanged — we only split where data is fetched so the
 * shell can flush early. Realtime, session_tokens, and storage are untouched.
 */
export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { id } = await params
  const { section: sectionParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Shell: auth + membership + campaign metadata (fast, blocking — drives redirects/role branching)
  const [membership, { data: campaign }] = await Promise.all([
    getCampaignMembership(id, user.id),
    supabase
      .from('campaigns')
      .select('id, name, description, owner_id, is_archived')
      .eq('id', id)
      .single(),
  ])

  if (!campaign) redirect('/app/dashboard')

  const isOwner = campaign.owner_id === user.id
  const role = membership?.role ?? (isOwner ? 'dm' : null)

  // No access: not a member AND not the owner
  if (!role) redirect('/app/dashboard')

  // Archived campaign — show read-only banner
  if (campaign.is_archived) {
    const t = await getTranslations("campaignArchive")
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-foreground text-xl font-semibold">{t("archived_banner_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("archived_banner_desc")}</p>
          <a href="/app/dashboard" className="inline-block text-gold hover:underline text-sm">
            {t("back_to_dashboard")}
          </a>
        </div>
      </div>
    )
  }

  // ── Player View ──────────────────────────────────────────────────────────
  if (role === 'player') {
    return (
      <Suspense fallback={<PlayerCampaignSkeleton />}>
        <CampaignPlayerViewServer
          campaignId={id}
          campaignName={campaign.name}
          ownerId={campaign.owner_id}
          userId={user.id}
        />
      </Suspense>
    )
  }

  // ── DM View ──────────────────────────────────────────────────────────────
  const activeSection = sectionParam && VALID_SECTIONS.includes(sectionParam as SectionId)
    ? (sectionParam as SectionId)
    : null

  return (
    <div className="space-y-6">
      <CampaignViewTransition viewKey={activeSection ?? "overview"}>
        <Suspense fallback={<CampaignPageSkeleton />}>
          <CampaignDmViewServer
            campaignId={campaign.id}
            campaignName={campaign.name}
            isOwner={isOwner}
            userId={user.id}
            activeSection={activeSection}
          />
        </Suspense>
      </CampaignViewTransition>
    </div>
  )
}
