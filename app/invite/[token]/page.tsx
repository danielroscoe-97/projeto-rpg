export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { InviteAcceptClient } from "@/components/campaign/InviteAcceptClient";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const t = await getTranslations("campaign");
  const supabase = await createClient();

  // Validate invite token
  const { data: invite } = await supabase
    .from("campaign_invites")
    .select("id, campaign_id, email, status, expires_at, campaigns(name, owner_id, users(display_name, email))")
    .eq("token", token)
    .maybeSingle();

  // Token not found
  if (!invite) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-foreground text-xl font-semibold">{t("invite_expired")}</h1>
          <Link href="/" className="text-gold hover:underline text-sm">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  // Token already used
  if (invite.status === "accepted") {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-foreground text-xl font-semibold">{t("invite_used")}</h1>
          <Link href="/" className="text-gold hover:underline text-sm">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  // Token expired
  if (invite.status === "expired" || new Date(invite.expires_at) < new Date()) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-foreground text-xl font-semibold">{t("invite_expired")}</h1>
          <Link href="/" className="text-gold hover:underline text-sm">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  const campaignData = invite.campaigns as unknown as {
    name: string;
    owner_id: string;
    users: { display_name: string | null; email: string };
  };

  if (!user) {
    // Not logged in — redirect to signup with invite params
    redirect(`/auth/sign-up?invite=${token}&campaign=${invite.campaign_id}`);
  }

  // Fetch user's standalone characters (available to bring into this campaign)
  const { data: existingCharacters } = await supabase
    .from("player_characters")
    .select("id, name, race, class, level, max_hp, ac, token_url")
    .eq("user_id", user.id)
    .is("campaign_id", null)
    .order("updated_at", { ascending: false });

  // Fetch unlinked campaign characters (DM-created, available for claim)
  const { data: unlinkedCharacters } = await supabase
    .from("player_characters")
    .select("id, name, max_hp, ac")
    .eq("campaign_id", invite.campaign_id)
    .is("user_id", null)
    .order("name");

  // User is authenticated — show character selection / creation flow
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md">
        <InviteAcceptClient
          inviteId={invite.id}
          campaignId={invite.campaign_id}
          campaignName={campaignData.name}
          dmName={campaignData.users?.display_name ?? campaignData.users?.email ?? "DM"}
          userId={user.id}
          token={token}
          existingCharacters={existingCharacters ?? []}
          unlinkedCharacters={unlinkedCharacters ?? []}
        />
      </div>
    </div>
  );
}
