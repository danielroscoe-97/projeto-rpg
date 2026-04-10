export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { JoinCampaignClient } from "@/components/campaign/JoinCampaignClient";

interface JoinCampaignPageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinCampaignPage({ params }: JoinCampaignPageProps) {
  const { code } = await params;
  const service = createServiceClient();

  // Validate join code (service client — join_code is a secret)
  const { data: campaign } = await service
    .from("campaigns")
    .select("id, name, owner_id, join_code_active, max_players, users!campaigns_owner_id_fkey(display_name, email)")
    .eq("join_code", code)
    .maybeSingle();

  if (!campaign) {
    return <ErrorPage message="Link inválido ou expirado." />;
  }

  if (!campaign.join_code_active) {
    return <ErrorPage message="Este link foi desativado pelo Mestre." />;
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
      return <ErrorPage message="Este link expirou. Peça um novo ao Mestre." />;
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
      return <ErrorPage message="Esta campanha está cheia. Peça ao Mestre para aumentar o limite de jogadores." />;
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

  if (existing) {
    redirect("/app/dashboard");
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

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-foreground text-xl font-semibold">{message}</h1>
        <Link href="/" className="text-gold hover:underline text-sm">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
