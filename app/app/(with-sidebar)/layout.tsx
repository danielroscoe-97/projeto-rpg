import { getTranslations } from "next-intl/server";
import { NavbarWithSync } from "@/components/layout/NavbarWithSync";
import { LogoutButton } from "@/components/logout-button";
import { OracleSearchTrigger } from "@/components/oracle/OracleSearchTrigger";
import { OracleAITrigger } from "@/components/oracle/OracleAITrigger";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AppSidebarClient } from "@/components/layout/AppSidebarClient";
import { AppSidebarMain } from "@/components/layout/AppSidebarMain";
import { BookOpen, Skull, Sparkles, HeartPulse, Backpack, GraduationCap, Star } from "lucide-react";
import { getAppLayoutContext } from "@/lib/auth/app-layout-context";

const NEW_SIDEBAR_ENABLED = process.env.NEXT_PUBLIC_FEATURE_NEW_SIDEBAR === "true";

/**
 * Chrome layout for routes that need sidebar/navbar. Auth, side-effects, and
 * skip-link are handled by the parent root layout at `app/app/layout.tsx`.
 * This layout only owns the sidebar/navbar and the `<main>` wrapper.
 */
export default async function WithSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Parent root layout has already enforced auth — context here is guaranteed
  // non-null. React.cache de-dupes the underlying queries.
  const [t, ctx] = await Promise.all([
    getTranslations("nav"),
    getAppLayoutContext(),
  ]);
  const { user, hasDmAccess } = ctx!;

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
      <>
        <AppSidebarClient hasDmAccess={hasDmAccess}>
          <NotificationBell userId={user.id} />
        </AppSidebarClient>
        <AppSidebarMain>
          <ErrorBoundary name="MainContent">{children}</ErrorBoundary>
        </AppSidebarMain>
      </>
    );
  }

  return (
    <>
      <NavbarWithSync
        brand={t("brand")}
        brandHref="/app/dashboard"
        links={navLinks}
        rightSlot={<><NotificationBell userId={user.id} /><OracleSearchTrigger /><OracleAITrigger /><LogoutButton /></>}
      />
      <main id="main-content" className="flex-1 pt-[72px] p-6 pb-28 lg:pb-6">
        <ErrorBoundary name="MainContent">
          {children}
        </ErrorBoundary>
      </main>
    </>
  );
}
