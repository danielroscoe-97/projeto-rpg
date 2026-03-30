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
    soundboard: t("soundboard"),
    settings: t("settings"),
    nav_label: t("nav_label"),
  };

  // Check if dashboard tour should be shown
  const { data: { user } } = await supabase.auth.getUser();
  let showDashboardTour = false;
  let tourSource: string | undefined;

  if (user) {
    const { data: onboarding } = await supabase
      .from("user_onboarding")
      .select("dashboard_tour_completed, source")
      .eq("user_id", user.id)
      .maybeSingle();

    showDashboardTour = onboarding ? !onboarding.dashboard_tour_completed : false;
    tourSource = onboarding?.source;
  }

  return (
    <DashboardLayout
      translations={translations}
      showDashboardTour={showDashboardTour}
      tourSource={tourSource}
    >
      {children}
    </DashboardLayout>
  );
}
