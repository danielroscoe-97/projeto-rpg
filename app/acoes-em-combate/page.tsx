import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicActionsGrid } from "@/components/public/PublicActionsGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import Link from "next/link";
import { PublicFooter } from "@/components/public/PublicFooter";

import { jsonLdScriptProps } from "@/lib/seo/metadata";
import { siteUrl } from "@/lib/seo/site-url";
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
    url: "/acoes-em-combate",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ações em Combate D&D 5e — Referência Rápida",
    description:
      "Referência completa de todas as ações de combate do D&D 5e com comparação 2014/2024.",
  },
  alternates: {
    canonical: "/acoes-em-combate",
    languages: {
      en: "/actions",
      "pt-BR": "/acoes-em-combate",
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
      url: siteUrl("/"),
    },
    inLanguage: "pt-BR",
  };

  return (
    <script {...jsonLdScriptProps(jsonLd)} />
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function AcoesEmCombatePage() {
  return (
    <>
      <ActionsJsonLd />

      <div className="min-h-screen bg-background">
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
            <Link href="/actions" className="text-gold hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
