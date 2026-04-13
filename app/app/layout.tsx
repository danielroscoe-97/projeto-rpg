import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import { NavbarWithSync } from "@/components/layout/NavbarWithSync";
import { LogoutButton } from "@/components/logout-button";
import { SrdInitializer } from "@/components/srd/SrdInitializer";
import { OracleSearchTrigger } from "@/components/oracle/OracleSearchTrigger";
import { OracleAITrigger } from "@/components/oracle/OracleAITrigger";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ConnectionStatus } from "@/components/pwa/ConnectionStatus";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { BookOpen, Skull, Sparkles, HeartPulse, Backpack, GraduationCap, Star } from "lucide-react";

// Lazy-load heavy Oracle components — they use @dnd-kit, Fuse.js, etc.
// and are not needed for initial page render.
const FloatingCardContainer = dynamic(
  () => import("@/components/oracle/FloatingCardContainer").then(m => ({ default: m.FloatingCardContainer })),
  { ssr: false }
);
const CommandPalette = dynamic(
  () => import("@/components/oracle/CommandPalette").then(m => ({ default: m.CommandPalette })),
  { ssr: false }
);
const OracleAIModal = dynamic(
  () => import("@/components/oracle/OracleAIModal").then(m => ({ default: m.OracleAIModal })),
  { ssr: false }
);
const DiceHistoryPanel = dynamic(
  () => import("@/components/dice/DiceHistoryPanel").then(m => ({ default: m.DiceHistoryPanel })),
  { ssr: false }
);

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Parallelize translations + Supabase client creation
  const [t, supabase] = await Promise.all([
    getTranslations("nav"),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      <footer className="lg:hidden border-t border-white/[0.08] px-6 py-3 flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        <a href="/legal/attribution" className="hover:text-foreground transition-colors">{t("attribution")}</a>
        <a href="/legal/privacy" className="hover:text-foreground transition-colors">{t("privacy")}</a>
      </footer>
    </div>
  );
}
