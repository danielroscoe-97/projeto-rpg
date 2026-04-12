import type { Metadata } from "next";
import Link from "next/link";
import { getSrdBackgrounds } from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicBackgroundGrid } from "@/components/public/PublicBackgroundGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Antecedentes D&D 5e — Antecedentes de Personagem SRD",
  description:
    "Todos os antecedentes SRD do D&D 5e — perícias, ferramentas, idiomas, equipamentos e características. Conteúdo livre sob CC-BY-4.0.",
  keywords: [
    "antecedentes D&D 5e",
    "lista de antecedentes dnd",
    "antecedentes SRD",
    "backgrounds D&D português",
    "características de antecedente",
    "perícias antecedente D&D",
  ],
  openGraph: {
    title: "Antecedentes D&D 5e — Antecedentes de Personagem SRD",
    description:
      "Referência completa de todos os antecedentes SRD do D&D 5ª Edição com perícias, características e equipamento.",
    type: "website",
    url: "https://pocketdm.com.br/antecedentes",
  },
  twitter: {
    card: "summary_large_image",
    title: "Antecedentes D&D 5e — Antecedentes de Personagem SRD",
    description: "Referência completa de todos os antecedentes SRD do D&D 5ª Edição.",
  },
  alternates: {
    canonical: "https://pocketdm.com.br/antecedentes",
    languages: {
      en: "https://pocketdm.com.br/backgrounds",
      "pt-BR": "https://pocketdm.com.br/antecedentes",
    },
  },
};

export const revalidate = 86400;

function BackgroundsJsonLd({ count }: { count: number }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Antecedentes D&D 5e",
    description: "Todos os antecedentes SRD de personagem do D&D 5ª Edição",
    url: "https://pocketdm.com.br/antecedentes",
    inLanguage: "pt-BR",
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://www.pocketdm.com.br",
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: count,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export default function AntecedentesPage() {
  const backgrounds = getSrdBackgrounds()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((bg) => ({
      id: bg.id,
      name: bg.name,
      skill_proficiencies: bg.skill_proficiencies,
      tool_proficiencies: bg.tool_proficiencies,
      languages: bg.languages,
      feature_name: bg.feature_name,
      source: bg.source,
      ruleset_version: bg.ruleset_version,
    }));

  return (
    <>
      <BackgroundsJsonLd count={backgrounds.length} />

      <div className="min-h-screen bg-background">
        <PublicNav locale="pt-BR" breadcrumbs={[{ label: "Antecedentes" }]} />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
              Antecedentes D&amp;D 5e
            </h1>
            <p className="text-gray-400 text-lg">
              {backgrounds.length} antecedentes — origens de personagem com perícias,
              ferramentas e características. Conteúdo SRD livre sob{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                className="underline hover:text-gray-200"
                target="_blank"
                rel="noopener noreferrer"
              >
                CC-BY-4.0
              </a>
              .
            </p>
          </div>

          <PublicBackgroundGrid backgrounds={backgrounds} locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName="Antecedentes D&D 5e" locale="pt-BR" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href="/backgrounds" className="text-gold hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
