import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicAbilityScoresGrid } from "@/components/public/PublicAbilityScoresGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import Link from "next/link";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Atributos D&D 5e \u2014 Calculadora de Modificador",
  description:
    "Referência completa dos seis atributos do D&D 5e: Força, Destreza, Constituição, Inteligência, Sabedoria e Carisma. Calculadora interativa de modificador com tabela completa.",
  openGraph: {
    title: "Atributos D&D 5e \u2014 Calculadora de Modificador",
    description:
      "Todos os seis atributos explicados com calculadora interativa de modificador, perícias associadas, testes de resistência e usos comuns.",
    type: "website",
    url: "https://pocketdm.com.br/atributos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Atributos D&D 5e \u2014 Calculadora de Modificador",
    description:
      "Todos os seis atributos explicados com calculadora interativa de modificador, perícias associadas, testes de resistência e usos comuns.",
  },
  alternates: {
    canonical: "https://pocketdm.com.br/atributos",
    languages: {
      en: "https://pocketdm.com.br/ability-scores",
      "pt-BR": "https://pocketdm.com.br/atributos",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
function AtributosJsonLd() {
  const atributos = [
    "Força",
    "Destreza",
    "Constituição",
    "Inteligência",
    "Sabedoria",
    "Carisma",
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Atributos D&D 5e",
    description:
      "Os seis atributos de Dungeons & Dragons 5ª Edição",
    numberOfItems: atributos.length,
    itemListElement: atributos.map((name, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
    })),
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://pocketdm.com.br",
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
export default function AtributosPage() {
  return (
    <>
      <AtributosJsonLd />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[{ label: "Atributos" }]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicAbilityScoresGrid locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName="Atributos D&D 5e" locale="pt-BR" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href="/ability-scores" className="text-[#D4A853] hover:underline">
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
              href="https://pocketdm.com.br"
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
