import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicDiceRoller } from "@/components/public/PublicDiceRoller";
import { PublicCTA } from "@/components/public/PublicCTA";
import Link from "next/link";
import { PublicFooter } from "@/components/public/PublicFooter";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Rolador de Dados D&D 5e — Role Online",
  description:
    "Rolador de dados grátis para D&D 5e. Role d4, d6, d8, d10, d12, d20, d100 com vantagem, desvantagem, acerto crítico e resistência. Presets rápidos para ataques, dano e testes.",
  keywords: [
    "rolador de dados D&D 5e",
    "rolar dados online",
    "rolar d20 online",
    "dados RPG online gratis",
    "rolador de dados virtual",
    "dados D&D online",
    "rolar dados com vantagem",
    "dados dungeons and dragons",
    "Pocket DM dados",
  ],
  openGraph: {
    title: "Rolador de Dados D&D 5e — Role Online",
    description:
      "Rolador de dados grátis com vantagem, crítico, presets e histórico.",
    type: "website",
    url: "/dados",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rolador de Dados D&D 5e — Role Online",
    description:
      "Rolador de dados grátis com vantagem, crítico, presets e histórico.",
  },
  alternates: {
    canonical: "/dados",
    languages: {
      en: "/dice",
      "pt-BR": "/dados",
    },
  },
};

// ── JSON-LD ────────────────────────────────────────────────────────
function DiceRollerJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Rolador de Dados D&D 5e",
    description: "Rolador de dados grátis para Dungeons & Dragons 5ª Edição",
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
    },
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "/",
    },
    inLanguage: "pt-BR",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function DadosPage() {
  return (
    <>
      <DiceRollerJsonLd />

      <div className="min-h-screen bg-background">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[{ label: "Rolador de Dados" }]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicDiceRoller locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName="Rolador de Dados D&D 5e" locale="pt-BR" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href="/dice" className="text-gold hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
