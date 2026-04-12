import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicAbilityScoresGrid } from "@/components/public/PublicAbilityScoresGrid";
import { PublicCTA } from "@/components/public/PublicCTA";
import Link from "next/link";
import { PublicFooter } from "@/components/public/PublicFooter";

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
export default function AtributosPage() {
  return (
    <>
      <AtributosJsonLd />

      <div className="min-h-screen bg-background">
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
            <Link href="/ability-scores" className="text-gold hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
