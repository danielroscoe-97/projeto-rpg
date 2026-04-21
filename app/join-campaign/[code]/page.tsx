export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { JoinCampaignClient } from "@/components/campaign/JoinCampaignClient";
import { AlreadyMemberRedirect } from "@/components/campaign/AlreadyMemberRedirect";

interface JoinCampaignPageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinCampaignPage({ params }: JoinCampaignPageProps) {
  const { code } = await params;
  const t = await getTranslations("joinCampaign");
  const service = createServiceClient();

  // Validate join code (service client — join_code is a secret)
  const { data: campaign } = await service
    .from("campaigns")
    .select("id, name, owner_id, join_code_active, max_players, is_archived, users!campaigns_owner_id_fkey(display_name, email)")
    .eq("join_code", code)
    .eq("is_archived", false)
    .maybeSingle();

  if (!campaign) {
    return <ErrorPage message={t("error_invalid_link")} backLabel={t("back_home")} />;
  }

  if (!campaign.join_code_active) {
    return <ErrorPage message={t("error_link_disabled")} backLabel={t("back_home")} />;
  }

  // Check join code expiration
  const { data: settingsData } = await service
    .from("campaign_settings")
    .select("join_code_expires_at")
    .eq("campaign_id", campaign.id)
    .maybeSingle();

  if (settingsData?.join_code_expires_at) {
    const expiresAt = new Date(settingsData.join_code_expires_at);
    if (expiresAt < new Date()) {
      return <ErrorPage message={t("error_link_expired")} backLabel={t("back_home")} />;
    }
  }

  // Check max_players capacity
  if (campaign.max_players !== null) {
    const { count: memberCount } = await service
      .from("campaign_members")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("status", "active");

    if ((memberCount ?? 0) >= campaign.max_players) {
      return <ErrorPage message={t("error_campaign_full")} backLabel={t("back_home")} />;
    }
  }

  // Check if user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/sign-up?join_code=${code}`);
  }

  // Already a member → redirect silently
  const { data: existing } = await service
    .from("campaign_members")
    .select("id")
    .eq("campaign_id", campaign.id)
    .eq("user_id", user.id)
    .maybeSingle();

  // Already a member. We AVOID calling `redirect()` here because this server
  // component is re-rendered as part of every server action response for
  // this route — and a `redirect()` throw inside that post-action re-render
  // stream is the exact bug that put us at 500 instead of a clean navigation
  // (Sentry: "An error occurred in the Server Components render", React
  // 19.3-canary / Next.js 15). Instead we render a tiny client component
  // that does `router.replace("/app/dashboard")` on mount, with a visible
  // fallback link for anyone whose JS is blocked. For direct GET hits by
  // already-members the UX is identical (near-instant redirect); for the
  // post-action re-render path this returns plain HTML and Next.js stops
  // trying to do a redirect inside a render stream.
  if (existing) {
    return <AlreadyMemberRedirect />;
  }

  // Fetch user's standalone characters (available to bring into this campaign)
  const { data: existingCharacters } = await supabase
    .from("player_characters")
    .select("id, name, race, class, level, max_hp, ac, token_url")
    .eq("user_id", user.id)
    .is("campaign_id", null)
    .order("updated_at", { ascending: false });

  const ownerData = campaign.users as unknown as { display_name: string | null; email: string } | null;
  const dmName = ownerData?.display_name ?? ownerData?.email ?? "DM";

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md">
        <JoinCampaignClient
          code={code}
          campaignName={campaign.name}
          dmName={dmName}
          existingCharacters={existingCharacters ?? []}
        />
      </div>
    </div>
  );
}

function ErrorPage({ message, backLabel }: { message: string; backLabel: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-foreground text-xl font-semibold">{message}</h1>
        <Link href="/" className="text-gold hover:underline text-sm">
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
