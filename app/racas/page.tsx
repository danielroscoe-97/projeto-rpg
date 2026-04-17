import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicRacesIndex } from "@/components/public/PublicRacesIndex";
import { PublicCTA } from "@/components/public/PublicCTA";
import Link from "next/link";
import { PublicFooter } from "@/components/public/PublicFooter";
import { collectionPageLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Raças D&D 5e — Espécies de Personagem Jogador",
  description:
    "Todas as 9 raças SRD do D&D 5e: Anão, Elfo, Halfling, Humano, Draconato, Gnomo, Meio-Elfo, Meio-Orc e Tiefling. Atributos, traços raciais e sub-raças.",
  keywords: [
    "raças D&D 5e",
    "raças de personagem D&D",
    "raças SRD 5e",
    "anão elfo halfling",
    "espécies D&D 5e",
    "raças jogáveis D&D",
  ],
  openGraph: {
    title: "Raças D&D 5e — Espécies de Personagem Jogador",
    description:
      "Referência completa das 9 raças SRD do D&D 5ª Edição com atributos e traços.",
    type: "website",
    url: "/racas",
  },
  twitter: {
    card: "summary_large_image",
    title: "Raças D&D 5e — Espécies de Personagem Jogador",
    description:
      "Referência completa das 9 raças SRD do D&D 5ª Edição.",
  },
  alternates: {
    canonical: "/racas",
    languages: {
      en: "/races",
      "pt-BR": "/racas",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
const RACE_NAMES_PT = [
  "Anão",
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
  const jsonLd = collectionPageLd({
    name: "Raças D&D 5e",
    description: "Todas as raças de personagem jogável no SRD do D&D 5ª Edição",
    path: "/racas",
    locale: "pt-BR",
    items: RACE_NAMES_PT.map((name, i) => ({
      name,
      path: `/racas/${RACE_SLUGS[i]}`,
    })),
  });
  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Início", path: "/" },
    { name: "Raças", path: "/racas" },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLd)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function RacasPage() {
  return (
    <>
      <RacesJsonLd />

      <div className="min-h-screen bg-background">
        <PublicNav locale="pt-BR" breadcrumbs={[{ label: "Raças" }]} />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <PublicRacesIndex locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName="Raças D&D 5e" locale="pt-BR" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href="/races" className="text-gold hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
