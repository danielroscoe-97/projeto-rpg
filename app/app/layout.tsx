import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { NavbarWithSync } from "@/components/layout/NavbarWithSync";
import { LogoutButton } from "@/components/logout-button";
import { SrdInitializer } from "@/components/srd/SrdInitializer";
import { FloatingCardContainer } from "@/components/oracle/FloatingCardContainer";
import { CommandPalette } from "@/components/oracle/CommandPalette";
import { OracleSearchTrigger } from "@/components/oracle/OracleSearchTrigger";
import { OracleFAB } from "@/components/oracle/OracleFAB";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { LayoutDashboard, Skull, Sparkles, HeartPulse, Package, Settings } from "lucide-react";

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
        links={[
          { href: "/app/dashboard", label: <span className="inline-flex items-center gap-1.5"><LayoutDashboard className="w-4 h-4" aria-hidden="true" />{t("dashboard")}</span> },
          { href: "/app/compendium?tab=monsters", label: <span className="inline-flex items-center gap-1.5"><Skull className="w-4 h-4" aria-hidden="true" />{t("monsters")}</span> },
          { href: "/app/compendium?tab=spells", label: <span className="inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" aria-hidden="true" />{t("spells")}</span> },
          { href: "/app/compendium?tab=conditions", label: <span className="inline-flex items-center gap-1.5"><HeartPulse className="w-4 h-4" aria-hidden="true" />{t("conditions")}</span> },
          { href: "/app/presets", label: <span className="inline-flex items-center gap-1.5"><Package className="w-4 h-4" aria-hidden="true" />{t("presets")}</span> },
          { href: "/app/settings", label: <span className="inline-flex items-center gap-1.5"><Settings className="w-4 h-4" aria-hidden="true" />{t("settings")}</span> },
        ]}
        rightSlot={<><OracleSearchTrigger /><LogoutButton /></>}
      />
      <SrdInitializer />
      <ErrorBoundary name="Oracle">
        <FloatingCardContainer />
        <CommandPalette />
        <OracleFAB />
      </ErrorBoundary>
      <main id="main-content" className="flex-1 pt-[72px] p-6">
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
