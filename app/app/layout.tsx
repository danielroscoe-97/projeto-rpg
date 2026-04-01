import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { NavbarWithSync } from "@/components/layout/NavbarWithSync";
import { LogoutButton } from "@/components/logout-button";
import { SrdInitializer } from "@/components/srd/SrdInitializer";
import { FloatingCardContainer } from "@/components/oracle/FloatingCardContainer";
import { CommandPalette } from "@/components/oracle/CommandPalette";
import { OracleSearchTrigger } from "@/components/oracle/OracleSearchTrigger";
import { OracleAITrigger } from "@/components/oracle/OracleAITrigger";
import { OracleAIModal } from "@/components/oracle/OracleAIModal";
import { DiceHistoryPanel } from "@/components/dice/DiceHistoryPanel";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ConnectionStatus } from "@/components/pwa/ConnectionStatus";
import { unstable_cache } from "next/cache";
import { LayoutDashboard, BookOpen, Skull, Sparkles, HeartPulse, Backpack, Package, Settings, Music } from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("nav");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // B.6: Check if user has DM access to decide whether to show Presets
  // Cached for 60s to avoid 3 extra queries on every /app/* navigation
  const getHasDmAccess = unstable_cache(
    async (userId: string) => {
      const [
        { count: dmMembershipCount },
        { count: ownedCampaignCount },
        { data: userData },
      ] = await Promise.all([
        supabase
          .from("campaign_members")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("role", "dm")
          .eq("status", "active"),
        supabase
          .from("campaigns")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", userId),
        supabase
          .from("users")
          .select("role")
          .eq("id", userId)
          .maybeSingle(),
      ]);

      const userDbRole = userData?.role ?? "both";
      return (
        (dmMembershipCount ?? 0) > 0 ||
        (ownedCampaignCount ?? 0) > 0 ||
        userDbRole === "dm" ||
        userDbRole === "both"
      );
    },
    [`dm-access-${user.id}`],
    { revalidate: 60 }
  );

  const hasDmAccess = await getHasDmAccess(user.id);

  // Build nav links — conditionally include Presets
  const navLinks = [
    {
      href: "/app/dashboard",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
          {t("dashboard")}
        </span>
      ),
    },
    {
      label: (
        <span className="inline-flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" aria-hidden="true" />
          {t("compendium")}
        </span>
      ),
      children: [
        {
          href: "/app/compendium?tab=monsters",
          label: (
            <span className="inline-flex items-center gap-1.5">
              <Skull className="w-4 h-4" aria-hidden="true" />
              {t("monsters")}
            </span>
          ),
        },
        {
          href: "/app/compendium?tab=spells",
          label: (
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              {t("spells")}
            </span>
          ),
        },
        {
          href: "/app/compendium?tab=items",
          label: (
            <span className="inline-flex items-center gap-1.5">
              <Backpack className="w-4 h-4" aria-hidden="true" />
              {t("items")}
            </span>
          ),
        },
        {
          href: "/app/compendium?tab=conditions",
          label: (
            <span className="inline-flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4" aria-hidden="true" />
              {t("conditions")}
            </span>
          ),
        },
      ],
    },
    // Only show Soundboard and Presets if user has DM access
    ...(hasDmAccess
      ? [
          {
            href: "/app/dashboard/soundboard",
            label: (
              <span className="inline-flex items-center gap-1.5">
                <Music className="w-4 h-4" aria-hidden="true" />
                {t("soundboard")}
              </span>
            ),
          },
          {
            href: "/app/presets",
            label: (
              <span className="inline-flex items-center gap-1.5">
                <Package className="w-4 h-4" aria-hidden="true" />
                {t("presets")}
              </span>
            ),
          },
        ]
      : []),
    {
      href: "/app/settings",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Settings className="w-4 h-4" aria-hidden="true" />
          {t("settings")}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip navigation — hidden until focused (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-gold focus:text-surface-primary focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        {t("skip_content")}
      </a>

      <NavbarWithSync
        brand={t("brand")}
        brandHref="/app/dashboard"
        links={navLinks}
        rightSlot={<><OracleSearchTrigger /><OracleAITrigger /><LogoutButton /></>}
      />
      <SrdInitializer />
      <ConnectionStatus />
      <ErrorBoundary name="Oracle">
        <FloatingCardContainer />
        <CommandPalette />
        <OracleAIModal />
        <DiceHistoryPanel />
      </ErrorBoundary>
      <main id="main-content" className="flex-1 pt-[72px] p-6 pb-28 lg:pb-6">
        <ErrorBoundary name="MainContent">
          {children}
        </ErrorBoundary>
      </main>
      <footer className="border-t border-white/[0.08] px-6 py-3 flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        <a href="/legal/attribution" className="hover:text-foreground transition-colors">{t("attribution")}</a>
        <a href="/legal/privacy" className="hover:text-foreground transition-colors">{t("privacy")}</a>
      </footer>
    </div>
  );
}
