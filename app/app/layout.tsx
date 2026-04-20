import { createClient, getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { NavbarWithSync } from "@/components/layout/NavbarWithSync";
import { LogoutButton } from "@/components/logout-button";
import { SrdInitializer } from "@/components/srd/SrdInitializer";
import { OracleSearchTrigger } from "@/components/oracle/OracleSearchTrigger";
import { OracleAITrigger } from "@/components/oracle/OracleAITrigger";
import { LazyOracleWidgets } from "@/components/oracle/LazyOracleWidgets";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ConnectionStatus } from "@/components/pwa/ConnectionStatus";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AppSidebarClient } from "@/components/layout/AppSidebarClient";
import { AppSidebarMain } from "@/components/layout/AppSidebarMain";
import { BookOpen, Skull, Sparkles, HeartPulse, Backpack, GraduationCap, Star } from "lucide-react";

const NEW_SIDEBAR_ENABLED = process.env.NEXT_PUBLIC_FEATURE_NEW_SIDEBAR === "true";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Parallelize translations + auth + Supabase client creation
  const [t, user, supabase] = await Promise.all([
    getTranslations("nav"),
    getAuthUser(),
    createClient(),
  ]);

  if (!user) {
    redirect("/auth/login");
  }

  // Check beta tester access (content_whitelist or admin)
  const [whitelistRes, adminRes] = await Promise.all([
    supabase
      .from("content_whitelist")
      .select("id")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .maybeSingle(),
    supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single(),
  ]);
  const isBetaTester =
    !!whitelistRes.data || (!adminRes.error && !!adminRes.data?.is_admin);

  // New sidebar: derive DM access once for the sidebar's DM-only items.
  let hasDmAccess = false;
  if (NEW_SIDEBAR_ENABLED) {
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
      supabase.from("users").select("role").eq("id", user.id).maybeSingle(),
    ]);
    const userDbRole = userRoleData?.role ?? "both";
    hasDmAccess =
      (dmMembershipCount ?? 0) > 0 ||
      (ownedCampaignCount ?? 0) > 0 ||
      userDbRole === "dm" ||
      userDbRole === "both";
  }

  // Header = action bar only. Navigation lives in the sidebar.
  // Only Compendium stays here (not duplicated in sidebar).
  const navLinks = [
    {
      tourId: "dash-nav-compendium",
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
        {
          href: "/app/compendium?tab=classes",
          label: (
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
              {t("classes")}
            </span>
          ),
        },
        {
          href: "/app/compendium?tab=feats",
          label: (
            <span className="inline-flex items-center gap-1.5">
              <Star className="w-4 h-4" aria-hidden="true" />
              {t("feats")}
            </span>
          ),
        },
      ],
    },
  ];

  if (NEW_SIDEBAR_ENABLED) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Skip navigation — hidden until focused (WCAG 2.4.1) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-gold focus:text-surface-primary focus:rounded-lg focus:text-sm focus:font-semibold"
        >
          {t("skip_content")}
        </a>

        <AppSidebarClient hasDmAccess={hasDmAccess}>
          <NotificationBell userId={user.id} />
        </AppSidebarClient>
        <SrdInitializer fullData={isBetaTester} />
        <ConnectionStatus />
        <ErrorBoundary name="Oracle">
          <LazyOracleWidgets />
        </ErrorBoundary>
        <AppSidebarMain>
          <ErrorBoundary name="MainContent">{children}</ErrorBoundary>
        </AppSidebarMain>
        <footer className="lg:hidden border-t border-white/[0.08] px-6 py-3 flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <a href="/legal/attribution" className="hover:text-foreground transition-colors">
            {t("attribution")}
          </a>
          <a href="/legal/privacy" className="hover:text-foreground transition-colors">
            {t("privacy")}
          </a>
        </footer>
      </div>
    );
  }

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
        rightSlot={<><NotificationBell userId={user.id} /><OracleSearchTrigger /><OracleAITrigger /><LogoutButton /></>}
      />
      <SrdInitializer fullData={isBetaTester} />
      <ConnectionStatus />
      <ErrorBoundary name="Oracle">
        <LazyOracleWidgets />
      </ErrorBoundary>
      <main id="main-content" className="flex-1 pt-[72px] p-6 pb-28 lg:pb-6">
        <ErrorBoundary name="MainContent">
          {children}
        </ErrorBoundary>
      </main>
      <footer className="lg:hidden border-t border-white/[0.08] px-6 py-3 flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        <a href="/legal/attribution" className="hover:text-foreground transition-colors">{t("attribution")}</a>
        <a href="/legal/privacy" className="hover:text-foreground transition-colors">{t("privacy")}</a>
      </footer>
    </div>
  );
}
