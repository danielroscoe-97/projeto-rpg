import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export default async function CompendiumRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Parallelize all independent setup (getAuthUser is cached per-request)
  const [t, user, supabase] = await Promise.all([
    getTranslations("sidebar"),
    getAuthUser(),
    createClient(),
  ]);

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
  let hasDmAccess = false;

  if (user) {
    const [dmMembershipRes, ownedCampaignRes, userRoleRes] = await Promise.allSettled([
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

    const dmMembershipCount = dmMembershipRes.status === "fulfilled" ? dmMembershipRes.value.count : 0;
    const ownedCampaignCount = ownedCampaignRes.status === "fulfilled" ? ownedCampaignRes.value.count : 0;
    const userDbRole = userRoleRes.status === "fulfilled" ? (userRoleRes.value.data?.role ?? "both") : "both";
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
