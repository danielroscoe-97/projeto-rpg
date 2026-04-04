import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicDamageTypesGrid } from "@/components/public/PublicDamageTypesGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import Link from "next/link";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Tipos de Dano D&D 5e — Referencia Completa | Pocket DM",
  description:
    "Referencia completa dos 13 tipos de dano do D&D 5e: acido, contundente, frio, fogo, forca, relampago, necrotico, perfurante, veneno, psiquico, radiante, cortante e trovao. Resistencias, imunidades e fontes comuns.",
  openGraph: {
    title: "Tipos de Dano D&D 5e — Referencia Completa | Pocket DM",
    description:
      "Todos os 13 tipos de dano do D&D 5e com resistencias, imunidades e fontes comuns.",
    type: "website",
    url: "https://www.pocketdm.com.br/tipos-de-dano",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tipos de Dano D&D 5e — Referencia Completa | Pocket DM",
    description:
      "Todos os 13 tipos de dano do D&D 5e com resistencias, imunidades e fontes comuns.",
  },
  alternates: {
    canonical: "https://www.pocketdm.com.br/tipos-de-dano",
    languages: {
      en: "https://www.pocketdm.com.br/damage-types",
      "pt-BR": "https://www.pocketdm.com.br/tipos-de-dano",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
const DAMAGE_TYPE_NAMES_PT = [
  "Acido",
  "Contundente",
  "Frio",
  "Fogo",
  "Forca",
  "Relampago",
  "Necrotico",
  "Perfurante",
  "Veneno",
  "Psiquico",
  "Radiante",
  "Cortante",
  "Trovao",
];

function DamageTypesJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Tipos de Dano D&D 5e",
    description:
      "Todos os 13 tipos de dano de Dungeons & Dragons 5a Edicao",
    numberOfItems: DAMAGE_TYPE_NAMES_PT.length,
    itemListElement: DAMAGE_TYPE_NAMES_PT.map((name, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
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
export default function TiposDeDanoPage() {
  return (
    <>
      <DamageTypesJsonLd />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[{ label: "Tipos de Dano" }]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          {/* Language toggle */}
          <p className="text-xs text-gray-500 mb-4">
            Pagina disponivel em{" "}
            <Link
              href="/damage-types"
              className="text-[#D4A853] hover:underline"
            >
              English
            </Link>
          </p>

          <PublicDamageTypesGrid locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName="Tipos de Dano D&D 5e" locale="pt-BR" />
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
            {" "}&mdash; O rastreador de combate para D&amp;D 5e
          </p>
        </footer>
      </div>
    </>
  );
}
