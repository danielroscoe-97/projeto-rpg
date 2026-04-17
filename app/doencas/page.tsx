import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicDiseasesGrid } from "@/components/public/PublicDiseasesGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import conditionsData from "@/data/srd/conditions.json";
import Link from "next/link";
import { PublicFooter } from "@/components/public/PublicFooter";

// -- Metadata -----------------------------------------------------------------
export const metadata: Metadata = {
  title: "Doenças D&D 5e — Referência",
  description:
    "Referência completa de doenças do D&D 5e: Febre da Gargalhada, Praga do Esgoto, Podridão da Visão e mais. Compare regras 2014 vs 2024.",
  openGraph: {
    title: "Doenças D&D 5e — Referência",
    description:
      "Referência completa de todas as doenças do D&D 5e com comparação 2014/2024.",
    type: "website",
    url: "/doencas",
  },
  twitter: {
    card: "summary_large_image",
    title: "Doenças D&D 5e — Referência",
    description:
      "Referência completa de todas as doenças do D&D 5e com comparação 2014/2024.",
  },
  alternates: {
    canonical: "/doencas",
    languages: {
      en: "/diseases",
      "pt-BR": "/doencas",
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
    name: "Doenças D&D 5e",
    description:
      "Doenças, pragas e aflições de Dungeons & Dragons 5ª Edição",
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

      <div className="min-h-screen bg-background">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[{ label: "Doenças" }]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicDiseasesGrid diseases={diseases} locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName="Doenças D&D 5e" locale="pt-BR" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href="/diseases" className="text-gold hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
