import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicClassesIndex } from "@/components/public/PublicClassesIndex";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getAllClassesFull } from "@/lib/srd/class-data-server";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Classes D&D 5e — Guia Completo de Classes SRD",
  description:
    "Todas as 12 classes SRD do D&D 5e: Bárbaro, Bardo, Clérigo, Druida, Guerreiro, Monge, Paladino, Patrulheiro, Ladino, Feiticeiro, Bruxo e Mago. Tabelas de progressão, habilidades e subclasses.",
  keywords: [
    "classes D&D 5e",
    "classes de personagem D&D",
    "classes SRD 5e",
    "bárbaro guerreiro mago",
    "classes jogáveis D&D",
    "guia de classes D&D",
  ],
  openGraph: {
    title: "Classes D&D 5e — Guia Completo de Classes SRD",
    description:
      "Referência completa das 12 classes SRD do D&D 5ª Edição com habilidades e subclasses.",
    type: "website",
    url: "https://pocketdm.com.br/classes-pt",
  },
  twitter: {
    card: "summary_large_image",
    title: "Classes D&D 5e — Guia Completo de Classes SRD",
    description:
      "Referência completa das 12 classes SRD do D&D 5ª Edição.",
  },
  alternates: {
    canonical: "https://pocketdm.com.br/classes-pt",
    languages: {
      en: "https://pocketdm.com.br/classes",
      "pt-BR": "https://pocketdm.com.br/classes-pt",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD ────────────────────────────────────────────────────────
function ClassesJsonLd() {
  const classes = getAllClassesFull();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Classes D&D 5e",
    description:
      "Todas as classes de personagem jogável no SRD do D&D 5ª Edição",
    numberOfItems: classes.length,
    itemListElement: classes.map((cls, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: cls.name_pt,
      url: `https://pocketdm.com.br/classes-pt/${cls.id}`,
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
export default function ClassesPtPage() {
  const classes = getAllClassesFull();

  return (
    <>
      <ClassesJsonLd />

      <div className="min-h-screen bg-background">
        <PublicNav locale="pt-BR" breadcrumbs={[{ label: "Classes" }]} />

        <main className="mx-auto max-w-6xl px-4 py-8">
          <PublicClassesIndex classes={classes} locale="pt-BR" linkPrefix="/classes-pt" />

          <div className="mt-12">
            <PublicCTA entityName="Classes D&D 5e" locale="pt-BR" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href="/classes" className="text-gold hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
