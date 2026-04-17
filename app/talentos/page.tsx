import type { Metadata } from "next";
import Link from "next/link";
import { getSrdFeats } from "@/lib/srd/srd-data-server";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFeatGrid } from "@/components/public/PublicFeatGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";
import { collectionPageLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

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
    url: "/talentos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Talentos D&D 5e — Talentos de Personagem SRD",
    description: "Referência completa de todos os talentos SRD do D&D 5ª Edição.",
  },
  alternates: {
    canonical: "/talentos",
    languages: {
      en: "/feats",
      "pt-BR": "/talentos",
    },
  },
};

export const revalidate = 86400;

function FeatsJsonLd({ feats }: { feats: Array<{ id: string; name: string }> }) {
  const jsonLd = collectionPageLd({
    name: "Talentos D&D 5e",
    description: "Todos os talentos SRD de personagem do D&D 5ª Edição",
    path: "/talentos",
    locale: "pt-BR",
    items: feats.map((f) => ({ name: f.name, path: `/talentos/${f.id}` })),
  });
  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Início", path: "/" },
    { name: "Talentos", path: "/talentos" },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLd)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
    </>
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
      <FeatsJsonLd feats={feats} />

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
            <Link href="/feats" className="text-gold hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
