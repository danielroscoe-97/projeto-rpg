import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicDiseasesGrid } from "@/components/public/PublicDiseasesGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import conditionsData from "@/public/srd/conditions.json";
import Link from "next/link";

// -- Metadata -----------------------------------------------------------------
export const metadata: Metadata = {
  title: "Doencas D&D 5e — Referencia | Pocket DM",
  description:
    "Referencia completa de doencas do D&D 5e: Febre da Gargalhada, Praga do Esgoto, Podridao da Visao e mais. Compare regras 2014 vs 2024.",
  openGraph: {
    title: "Doencas D&D 5e — Referencia | Pocket DM",
    description:
      "Referencia completa de todas as doencas do D&D 5e com comparacao 2014/2024.",
    type: "website",
    url: "https://www.pocketdm.com.br/doencas",
  },
  twitter: {
    card: "summary_large_image",
    title: "Doencas D&D 5e — Referencia | Pocket DM",
    description:
      "Referencia completa de todas as doencas do D&D 5e com comparacao 2014/2024.",
  },
  alternates: {
    canonical: "https://www.pocketdm.com.br/doencas",
    languages: {
      en: "https://www.pocketdm.com.br/diseases",
      "pt-BR": "https://www.pocketdm.com.br/doencas",
    },
  },
};

export const revalidate = 86400;

// -- JSON-LD ------------------------------------------------------------------
function DiseasesJsonLd() {
  const diseases = (
    conditionsData as Array<{
      name: string;
      category: string;
      ruleset_version: string;
    }>
  ).filter((c) => c.category === "disease" && c.ruleset_version === "2014");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Doencas D&D 5e",
    description:
      "Doencas, pragas e aflicoes de Dungeons & Dragons 5a Edicao",
    numberOfItems: diseases.length,
    itemListElement: diseases.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
    })),
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://www.pocketdm.com.br",
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

// -- Page ---------------------------------------------------------------------
export default function DoencasPage() {
  const diseases = conditionsData as Array<{
    id: string;
    name: string;
    description: string;
    source?: string;
    ruleset_version: "2014" | "2024";
    category: "condition" | "status" | "disease";
  }>;

  return (
    <>
      <DiseasesJsonLd />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[{ label: "Doencas" }]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          {/* Language toggle */}
          <p className="text-xs text-gray-500 mb-4">
            Pagina disponivel em{" "}
            <Link
              href="/diseases"
              className="text-[#D4A853] hover:underline"
            >
              English
            </Link>
          </p>

          <PublicDiseasesGrid diseases={diseases} locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName="Doencas D&D 5e" locale="pt-BR" />
          </div>
        </main>

        <footer className="border-t border-gray-800 mt-16 py-8 text-center text-gray-500 text-xs">
          <p>
            Conteudo SRD utilizado sob{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              className="underline hover:text-gray-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Creative Commons Attribution 4.0
            </a>
            . D&amp;D e Dungeons &amp; Dragons sao marcas registradas da Wizards
            of the Coast.
          </p>
          <p className="mt-1">
            <a
              href="https://www.pocketdm.com.br"
              className="underline hover:text-gray-300"
            >
              Pocket DM
            </a>
            {" "}— O rastreador de combate para D&amp;D 5e
          </p>
        </footer>
      </div>
    </>
  );
}
