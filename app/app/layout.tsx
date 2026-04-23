import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SrdInitializer } from "@/components/srd/SrdInitializer";
import { LazyOracleWidgets } from "@/components/oracle/LazyOracleWidgets";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ConnectionStatus } from "@/components/pwa/ConnectionStatus";
import { CombatInviteListenerMount } from "@/components/notifications/CombatInviteListenerMount";
import { UserRoleListenerMount } from "@/components/realtime/UserRoleListenerMount";
import { GlobalKeyboardShortcuts } from "@/components/layout/GlobalKeyboardShortcuts";
import { getAppLayoutContext } from "@/lib/auth/app-layout-context";

/**
 * Root layout for every `/app/*` route. Owns auth guard and the side-effect
 * components that must persist across navigation (SRD bootstrap, realtime
 * listeners, keyboard shortcuts, connection status, oracle widgets).
 *
 * Chrome (sidebar, navbar, `<main>` wrapper) lives in the route-group layouts
 * under `(with-sidebar)/` and `(focused)/`, so navigating between a sidebar
 * route and a focused route does NOT unmount these listeners — preventing
 * Supabase channel churn and SRD re-initialization.
 */
export default async function AppRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [t, ctx] = await Promise.all([
    getTranslations("nav"),
    getAppLayoutContext(),
  ]);

  if (!ctx) {
    redirect("/auth/login");
  }

  const { user, isBetaTester } = ctx;

  return (
    <div className="min-h-screen flex flex-col" translate="no">
      {/* Skip navigation — hidden until focused (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-gold focus:text-surface-primary focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        {t("skip_content")}
      </a>

      <SrdInitializer fullData={isBetaTester} />
      <CombatInviteListenerMount userId={user.id} />
      <UserRoleListenerMount userId={user.id} />
      <ConnectionStatus />
      <GlobalKeyboardShortcuts />
      <ErrorBoundary name="Oracle">
        <LazyOracleWidgets />
      </ErrorBoundary>

      {children}

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
