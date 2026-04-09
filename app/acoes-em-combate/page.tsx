import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicActionsGrid } from "@/components/public/PublicActionsGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import Link from "next/link";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Ações em Combate D&D 5e — Referência Rápida",
  description:
    "Referência completa de todas as ações de combate do D&D 5e: Atacar, Conjurar, Disparada, Esquivar, Desengajar, Ajudar, Esconder-se, Preparar, Procurar e mais. Compare regras 2014 vs 2024.",
  openGraph: {
    title: "Ações em Combate D&D 5e — Referência Rápida",
    description:
      "Referência completa de todas as ações de combate do D&D 5e com comparação 2014/2024.",
    type: "website",
    url: "https://pocketdm.com.br/acoes-em-combate",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ações em Combate D&D 5e — Referência Rápida",
    description:
      "Referência completa de todas as ações de combate do D&D 5e com comparação 2014/2024.",
  },
  alternates: {
    canonical: "https://pocketdm.com.br/acoes-em-combate",
    languages: {
      en: "https://pocketdm.com.br/actions",
      "pt-BR": "https://pocketdm.com.br/acoes-em-combate",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
function ActionsJsonLd() {
  const actions = [
    "Atacar",
    "Conjurar uma Magia",
    "Disparada",
    "Desengajar",
    "Esquivar",
    "Ajudar",
    "Esconder-se",
    "Preparar",
    "Procurar",
    "Usar um Objeto",
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Ações em Combate D&D 5e",
    description:
      "Todas as ações disponíveis durante combate em Dungeons & Dragons 5a Edição",
    numberOfItems: actions.length,
    itemListElement: actions.map((name, i) => ({
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
export default function AcoesEmCombatePage() {
  return (
    <>
      <ActionsJsonLd />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[{ label: "Ações em Combate" }]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicActionsGrid locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName="Ações de Combate D&D 5e" locale="pt-BR" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href="/actions" className="text-[#D4A853] hover:underline">
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
