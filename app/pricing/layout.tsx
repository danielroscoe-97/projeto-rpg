import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Preços — Pocket DM | Combat Tracker D&D 5e Grátis e Pro",
  description:
    "Comece grátis com o Pocket DM — combat tracker completo para D&D 5e. Plano Pro para campanhas ilimitadas, áudio ambiente e features exclusivas. Pricing for D&D 5e combat tracker.",
  alternates: {
    canonical: "https://pocketdm.com.br/pricing",
    languages: { "pt-BR": "/pricing", en: "/pricing" },
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-gold focus:text-surface-primary focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>
      <Navbar
        brand="Pocket DM"
        brandHref="/"
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
      <main id="main-content" className="flex-1 pt-[72px]">{children}</main>
      <Footer />
    </div>
  );
}
