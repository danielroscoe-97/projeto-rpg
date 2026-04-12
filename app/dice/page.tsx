import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicDiceRoller } from "@/components/public/PublicDiceRoller";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "D&D 5e Dice Roller — Roll Online",
  description:
    "Free online dice roller for D&D 5e. Roll d4, d6, d8, d10, d12, d20, d100 with advantage, disadvantage, critical hits, and resistance. Quick presets for attacks, damage, and ability checks.",
  openGraph: {
    title: "D&D 5e Dice Roller — Roll Online",
    description:
      "Free online dice roller with advantage, critical, presets, and roll history.",
    type: "website",
    url: "https://pocketdm.com.br/dice",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Dice Roller — Roll Online",
    description:
      "Free online dice roller with advantage, critical, presets, and roll history.",
  },
  alternates: {
    canonical: "https://pocketdm.com.br/dice",
    languages: {
      en: "https://pocketdm.com.br/dice",
      "pt-BR": "https://pocketdm.com.br/dados",
    },
  },
};

// ── JSON-LD ────────────────────────────────────────────────────────
function DiceRollerJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "D&D 5e Dice Roller",
    description: "Free online dice roller for Dungeons & Dragons 5th Edition",
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://www.pocketdm.com.br",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function DicePage() {
  return (
    <>
      <DiceRollerJsonLd />

      <div className="min-h-screen bg-background">
        <PublicNav breadcrumbs={[{ label: "Dice Roller" }]} />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicDiceRoller locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Dice Roller" locale="en" />
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
