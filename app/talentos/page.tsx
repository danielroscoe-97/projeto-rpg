import type { Metadata } from "next";
import Link from "next/link";
import { getSrdFeats } from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFeatGrid } from "@/components/public/PublicFeatGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Talentos D&D 5e — Talentos de Personagem SRD",
  description:
    "Todos os talentos SRD do D&D 5e — habilidades especiais, bênçãos e talentos de personagem. Busque e filtre por pré-requisito. Conteúdo livre sob CC-BY-4.0.",
  keywords: [
    "talentos D&D 5e",
    "lista de talentos dnd",
    "talentos SRD",
    "talentos de personagem D&D",
    "bênçãos 5e",
    "feats D&D português",
  ],
  openGraph: {
    title: "Talentos D&D 5e — Talentos de Personagem SRD",
    description:
      "Referência completa de todos os talentos SRD do D&D 5ª Edição com pré-requisitos e descrições.",
    type: "website",
    url: "https://pocketdm.com.br/talentos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Talentos D&D 5e — Talentos de Personagem SRD",
    description: "Referência completa de todos os talentos SRD do D&D 5ª Edição.",
  },
  alternates: {
    canonical: "https://pocketdm.com.br/talentos",
    languages: {
      en: "https://pocketdm.com.br/feats",
      "pt-BR": "https://pocketdm.com.br/talentos",
    },
  },
};

export const revalidate = 86400;

function FeatsJsonLd({ count }: { count: number }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Talentos D&D 5e",
    description: "Todos os talentos SRD de personagem do D&D 5ª Edição",
    url: "https://pocketdm.com.br/talentos",
    inLanguage: "pt-BR",
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://pocketdm.com.br",
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

export default function TalentosPage() {
  const feats = getSrdFeats()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      prerequisite: f.prerequisite,
      source: f.source,
      ruleset_version: f.ruleset_version,
    }));

  return (
    <>
      <FeatsJsonLd count={feats.length} />

      <div className="min-h-screen bg-background">
        <PublicNav locale="pt-BR" breadcrumbs={[{ label: "Talentos" }]} />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-2">
              Talentos D&amp;D 5e
            </h1>
            <p className="text-gray-400 text-lg">
              {feats.length} talentos — habilidades especiais, bênçãos e talentos para seu
              personagem. Conteúdo SRD livre sob{" "}
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

          <PublicFeatGrid feats={feats} locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName="Talentos D&D 5e" locale="pt-BR" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href="/feats" className="text-[#D4A853] hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
