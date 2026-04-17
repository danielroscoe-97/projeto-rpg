import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicDamageTypesGrid } from "@/components/public/PublicDamageTypesGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import Link from "next/link";
import { PublicFooter } from "@/components/public/PublicFooter";

import { jsonLdScriptProps } from "@/lib/seo/metadata";
import { siteUrl } from "@/lib/seo/site-url";
// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Tipos de Dano D&D 5e — Referência Completa",
  description:
    "Referência completa dos 13 tipos de dano do D&D 5e: ácido, contundente, frio, fogo, força, relâmpago, necrótico, perfurante, veneno, psíquico, radiante, cortante e trovão. Resistências, imunidades e fontes comuns.",
  openGraph: {
    title: "Tipos de Dano D&D 5e — Referência Completa",
    description:
      "Todos os 13 tipos de dano do D&D 5e com resistências, imunidades e fontes comuns.",
    type: "website",
    url: "/tipos-de-dano",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tipos de Dano D&D 5e — Referência Completa",
    description:
      "Todos os 13 tipos de dano do D&D 5e com resistências, imunidades e fontes comuns.",
  },
  alternates: {
    canonical: "/tipos-de-dano",
    languages: {
      en: "/damage-types",
      "pt-BR": "/tipos-de-dano",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
const DAMAGE_TYPE_NAMES_PT = [
  "Ácido",
  "Contundente",
  "Frio",
  "Fogo",
  "Força",
  "Relâmpago",
  "Necrótico",
  "Perfurante",
  "Veneno",
  "Psíquico",
  "Radiante",
  "Cortante",
  "Trovão",
];

function DamageTypesJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Tipos de Dano D&D 5e",
    description:
      "Todos os 13 tipos de dano de Dungeons & Dragons 5ª Edição",
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
      url: siteUrl("/"),
    },
    inLanguage: "pt-BR",
  };

  return (
    <script {...jsonLdScriptProps(jsonLd)} />
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function TiposDeDanoPage() {
  return (
    <>
      <DamageTypesJsonLd />

      <div className="min-h-screen bg-background">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[{ label: "Tipos de Dano" }]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicDamageTypesGrid locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName="Tipos de Dano D&D 5e" locale="pt-BR" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href="/damage-types" className="text-gold hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
