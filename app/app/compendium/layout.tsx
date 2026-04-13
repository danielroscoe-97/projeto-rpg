import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default async function CompendiumRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("sidebar");
  const supabase = await createClient();

  const translations = {
    overview: t("overview"),
    campaigns: t("campaigns"),
    combats: t("combats"),
    characters: t("characters"),
    compendium: t("compendium"),
    soundboard: t("soundboard"),
    presets: t("presets"),
    settings: t("settings"),
    profile: t("profile"),
    more: t("more"),
    nav_label: t("nav_label"),
    new_combat: t("new_combat"),
    invite_player: t("invite_player"),
    quick_actions: t("quick_actions"),
  };

  const { data: { user } } = await supabase.auth.getUser();
  let hasDmAccess = false;

  if (user) {
    const [
      { count: dmMembershipCount },
      { count: ownedCampaignCount },
      { data: userRoleData },
    ] = await Promise.all([
      supabase
        .from("campaign_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("role", "dm")
        .eq("status", "active"),
      supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id),
      supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const userDbRole = userRoleData?.role ?? "both";
    hasDmAccess =
      (dmMembershipCount ?? 0) > 0 ||
      (ownedCampaignCount ?? 0) > 0 ||
      userDbRole === "dm" ||
      userDbRole === "both";
  }

  return (
    <DashboardLayout translations={translations} hasDmAccess={hasDmAccess}>
      {children}
    </DashboardLayout>
  );
}
