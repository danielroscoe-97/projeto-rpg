import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicConditionsGrid } from "@/components/public/PublicConditionsGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import conditionsData from "@/public/srd/conditions.json";
import Link from "next/link";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Condições D&D 5e — Referência Rápida",
  description:
    "Referência completa de todas as condições do D&D 5e: Cego, Encantado, Amedrontado, Paralisado, Atordoado e mais. Compare regras 2014 vs 2024.",
  openGraph: {
    title: "Condições D&D 5e — Referência Rápida",
    description:
      "Referência completa de todas as condições do D&D 5e com comparação 2014/2024.",
    type: "website",
    url: "https://www.pocketdm.com.br/condicoes",
  },
  twitter: {
    card: "summary_large_image",
    title: "Condições D&D 5e — Referência Rápida",
    description:
      "Referência completa de todas as condições do D&D 5e com comparação 2014/2024.",
  },
  alternates: {
    canonical: "https://www.pocketdm.com.br/condicoes",
    languages: {
      en: "https://www.pocketdm.com.br/conditions",
      "pt-BR": "https://www.pocketdm.com.br/condicoes",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
function ConditionsJsonLd() {
  const conditions = (conditionsData as Array<{ name: string; category: string; ruleset_version: string }>)
    .filter((c) => c.category === "condition" && c.ruleset_version === "2024");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Condições D&D 5e",
    description: "Todas as condições de Dungeons & Dragons 5ª Edição",
    numberOfItems: conditions.length,
    itemListElement: conditions.map((c, i) => ({
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

// ── Page ───────────────────────────────────────────────────────────
export default function CondicoesPage() {
  const conditions = conditionsData as Array<{
    id: string;
    name: string;
    description: string;
    ruleset_version: "2014" | "2024";
    category: "condition" | "status" | "disease";
  }>;

  return (
    <>
      <ConditionsJsonLd />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[{ label: "Condições" }]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicConditionsGrid conditions={conditions} locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName="Condições D&D 5e" locale="pt-BR" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href="/conditions" className="text-[#D4A853] hover:underline">
              English
            </Link>
          </p>
        </main>

        <footer className="border-t border-gray-800 mt-16 py-8 text-center text-gray-500 text-xs">
          <p>
            Conteúdo SRD utilizado sob{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              className="underline hover:text-gray-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Creative Commons Attribution 4.0
            </a>
            . D&amp;D e Dungeons &amp; Dragons são marcas registradas da Wizards
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
