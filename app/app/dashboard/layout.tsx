import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default async function DashboardRouteLayout({
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

  // Check if dashboard tour should be shown + DM access for sidebar presets
  const { data: { user } } = await supabase.auth.getUser();
  let showDashboardTour = false;
  let isPlayerFirstCampaign = false;
  let tourSource: string | undefined;
  let hasDmAccess = false;

  if (user) {
    const [
      { data: onboarding },
      { count: dmMembershipCount },
      { count: ownedCampaignCount },
      { data: userRoleData },
    ] = await Promise.all([
      supabase
        .from("user_onboarding")
        .select("wizard_completed, dashboard_tour_completed, source")
        .eq("user_id", user.id)
        .maybeSingle(),
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
    const dmAccess =
      (dmMembershipCount ?? 0) > 0 ||
      (ownedCampaignCount ?? 0) > 0 ||
      userDbRole === "dm" ||
      userDbRole === "both";

    showDashboardTour = onboarding
      ? (onboarding.wizard_completed && !onboarding.dashboard_tour_completed)
      : false;
    tourSource = onboarding?.source;
    hasDmAccess = dmAccess;

    // JO-12: Player tour — triggers for any pure player who hasn't completed the tour
    isPlayerFirstCampaign = (
      !hasDmAccess &&
      !(onboarding?.dashboard_tour_completed ?? false)
    );
  }

  return (
    <DashboardLayout
      translations={translations}
      hasDmAccess={hasDmAccess}
      showDashboardTour={showDashboardTour}
      isPlayerFirstCampaign={isPlayerFirstCampaign}
      tourSource={tourSource}
    >
      {children}
    </DashboardLayout>
  );
}
