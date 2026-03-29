import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { SrdLoadingScreen } from "@/components/srd/SrdLoadingScreen";
import { FloatingCardContainer } from "@/components/oracle/FloatingCardContainer";
import { GuestBanner } from "@/components/guest/GuestBanner";
import { TourProvider } from "@/components/tour/TourProvider";

export default function TryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        brand="Pocket DM"
        brandHref="/"
        links={[{ href: "/pricing", label: "Preços" }]}
        rightSlot={
          <>
            <Link
              href="/auth/login"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center text-sm"
            >
              Login
            </Link>
            <Link
              href="/auth/sign-up"
              className="bg-gold text-surface-primary font-semibold px-4 rounded-lg min-h-[44px] inline-flex items-center text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms]"
            >
              Criar Conta
            </Link>
          </>
        }
      />
      <SrdLoadingScreen>
        <FloatingCardContainer />
        <main className="flex-1 pt-[72px] isolate">
          <GuestBanner />
          <div className="p-6">
            {children}
          </div>
          <TourProvider />
        </main>
      </SrdLoadingScreen>
    </div>
  );
}
