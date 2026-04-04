import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Navbar } from "@/components/layout/Navbar";
import { SrdLoadingScreen } from "@/components/srd/SrdLoadingScreen";
import { FloatingCardContainer } from "@/components/oracle/FloatingCardContainer";
import { GuestBanner } from "@/components/guest/GuestBanner";
import { TourProvider } from "@/components/tour/TourProvider";
import { DiceHistoryPanel } from "@/components/dice/DiceHistoryPanel";

export default async function TryLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("common");
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        brand="Pocket DM"
        brandHref="/"
        links={[{ href: "/pricing", label: t("footer_pricing") }]}
        rightSlot={
          <>
            <Link
              href="/auth/login"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center text-sm"
            >
              {t("footer_login")}
            </Link>
            <Link
              href="/auth/sign-up"
              className="bg-gold text-surface-primary font-semibold px-4 rounded-lg min-h-[44px] inline-flex items-center text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms]"
            >
              {t("footer_signup")}
            </Link>
          </>
        }
      />
      <SrdLoadingScreen>
        <FloatingCardContainer />
        <main className="flex-1 pt-[72px] isolate">
          <GuestBanner />
          <div className="p-3 sm:p-6">
            {children}
          </div>
          <DiceHistoryPanel />
        </main>
      </SrdLoadingScreen>
      {/* TourProvider outside SrdLoadingScreen so it's never inside the `inert` wrapper.
          The tour auto-starts before SRD loads and must be interactive from first render. */}
      <TourProvider />
    </div>
  );
}
