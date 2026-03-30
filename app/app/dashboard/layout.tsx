import { getTranslations } from "next-intl/server";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("sidebar");

  const translations = {
    overview: t("overview"),
    campaigns: t("campaigns"),
    combats: t("combats"),
    soundboard: t("soundboard"),
    settings: t("settings"),
  };

  return <DashboardLayout translations={translations}>{children}</DashboardLayout>;
}
