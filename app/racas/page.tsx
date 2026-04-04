import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicRacesIndex } from "@/components/public/PublicRacesIndex";
import { PublicCTA } from "@/components/public/PublicCTA";
import Link from "next/link";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Racas D&D 5e — Especies de Personagem Jogador | Pocket DM",
  description:
    "Todas as 9 racas SRD do D&D 5e: Anao, Elfo, Halfling, Humano, Draconato, Gnomo, Meio-Elfo, Meio-Orc e Tiefling. Atributos, tracos raciais e sub-racas.",
  keywords: [
    "racas D&D 5e",
    "racas de personagem D&D",
    "racas SRD 5e",
    "anao elfo halfling",
    "especies D&D 5e",
    "racas jogaveis D&D",
  ],
  openGraph: {
    title: "Racas D&D 5e — Especies de Personagem Jogador | Pocket DM",
    description:
      "Referencia completa das 9 racas SRD do D&D 5a Edicao com atributos e tracos.",
    type: "website",
    url: "https://www.pocketdm.com.br/racas",
  },
  twitter: {
    card: "summary_large_image",
    title: "Racas D&D 5e — Especies de Personagem Jogador | Pocket DM",
    description:
      "Referencia completa das 9 racas SRD do D&D 5a Edicao.",
  },
  alternates: {
    canonical: "https://www.pocketdm.com.br/racas",
    languages: {
      en: "https://www.pocketdm.com.br/races",
      "pt-BR": "https://www.pocketdm.com.br/racas",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
const RACE_NAMES_PT = [
  "Anao",
  "Elfo",
  "Halfling",
  "Humano",
  "Draconato",
  "Gnomo",
  "Meio-Elfo",
  "Meio-Orc",
  "Tiefling",
];

const RACE_SLUGS = [
  "dwarf",
  "elf",
  "halfling",
  "human",
  "dragonborn",
  "gnome",
  "half-elf",
  "half-orc",
  "tiefling",
];

function RacesJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Racas D&D 5e",
    description:
      "Todas as racas de personagem jogavel no SRD do D&D 5a Edicao",
    numberOfItems: RACE_NAMES_PT.length,
    itemListElement: RACE_NAMES_PT.map((name, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      url: `https://www.pocketdm.com.br/racas/${RACE_SLUGS[i]}`,
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
export default function RacasPage() {
  return (
    <>
      <RacesJsonLd />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav locale="pt-BR" breadcrumbs={[{ label: "Racas" }]} />

        <main className="mx-auto max-w-6xl px-4 py-8">
          {/* Language toggle */}
          <p className="text-xs text-gray-500 mb-4">
            Pagina disponivel em{" "}
            <Link
              href="/races"
              className="text-[#D4A853] hover:underline"
            >
              English
            </Link>
          </p>

          <PublicRacesIndex locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName="Racas D&D 5e" locale="pt-BR" />
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
