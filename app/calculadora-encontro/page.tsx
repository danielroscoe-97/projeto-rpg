import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicEncounterBuilder } from "@/components/public/PublicEncounterBuilder";
import { PublicCTA } from "@/components/public/PublicCTA";
import { getSrdMonsters, toSlug } from "@/lib/srd/srd-data-server";
import Link from "next/link";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Calculadora de Encontro D&D 5e — Dificuldade",
  description:
    "Calculadora de dificuldade de encontro grátis para D&D 5e. Adicione monstros de 1.100+ criaturas SRD, defina o tamanho e nível do grupo, e veja instantaneamente se o encontro é Fácil, Médio, Difícil ou Mortal.",
  openGraph: {
    title: "Calculadora de Encontro D&D 5e",
    description:
      "Calculadora de encontro grátis com 1.100+ monstros SRD e cálculo de dificuldade instantâneo.",
    type: "website",
    url: "https://www.pocketdm.com.br/calculadora-encontro",
  },
  twitter: {
    card: "summary_large_image",
    title: "Calculadora de Encontro D&D 5e",
    description:
      "Calculadora de encontro grátis com 1.100+ monstros SRD e cálculo de dificuldade instantâneo.",
  },
  alternates: {
    canonical: "https://www.pocketdm.com.br/calculadora-encontro",
    languages: {
      en: "https://www.pocketdm.com.br/encounter-builder",
      "pt-BR": "https://www.pocketdm.com.br/calculadora-encontro",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
function EncounterBuilderJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Calculadora de Encontro D&D 5e",
    description: "Calculadora de dificuldade de encontro grátis para D&D 5ª Edição",
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
    },
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
export default function CalculadoraEncontroPage() {
  const monsters = getSrdMonsters().map((m) => ({
    name: m.name,
    cr: m.cr,
    type: m.type,
    slug: toSlug(m.name),
    token_url: m.token_url ?? null,
    fallback_token_url: m.fallback_token_url ?? null,
  }));

  return (
    <>
      <EncounterBuilderJsonLd />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[{ label: "Calculadora de Encontro" }]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicEncounterBuilder monsters={monsters} locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName="Calculadora de Encontro D&D 5e" locale="pt-BR" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href="/encounter-builder" className="text-[#D4A853] hover:underline">
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
            . D&amp;D e Dungeons &amp; Dragons são marcas registradas da Wizards of the Coast.
          </p>
          <p className="mt-1">
            <a href="https://www.pocketdm.com.br" className="underline hover:text-gray-300">
              Pocket DM
            </a>
            {" "}— O rastreador de combate para D&amp;D 5e
          </p>
        </footer>
      </div>
    </>
  );
}
