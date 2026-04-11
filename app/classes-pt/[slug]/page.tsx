import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicClassFullDetail } from "@/components/public/PublicClassFullDetail";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  getClassFull,
  getAllClassesFull,
  getSubclassesForClass,
} from "@/lib/srd/class-data-server";

// ── Static generation ──────────────────────────────────────────────
export async function generateStaticParams() {
  return getAllClassesFull().map((c) => ({ slug: c.id }));
}

export const revalidate = 86400;

// ── Metadata ───────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cls = getClassFull(slug);
  if (!cls) return { title: "Classe Não Encontrada" };

  const title = `${cls.name_pt} — Classe D&D 5e`;
  const description = `${cls.name_pt}: ${cls.description_pt} Dado de Vida: ${cls.hit_die}. Habilidade Primária: ${cls.primary_ability}. Subclasse SRD: ${cls.srd_subclass_pt}. Guia completo com habilidades, tabela de progressão e equipamento.`;

  return {
    title,
    description,
    keywords: [
      `${cls.name_pt} 5e`,
      `D&D ${cls.name_pt}`,
      `classe ${cls.name_pt}`,
      `guia ${cls.name_pt}`,
      cls.srd_subclass_pt,
      "classes D&D 5e",
      "classe SRD",
    ],
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `https://pocketdm.com.br/classes-pt/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `https://pocketdm.com.br/classes-pt/${slug}`,
      languages: {
        en: `https://pocketdm.com.br/classes/${slug}`,
        "pt-BR": `https://pocketdm.com.br/classes-pt/${slug}`,
      },
    },
  };
}

// ── JSON-LD ────────────────────────────────────────────────────────
function ClassJsonLd({
  cls,
  slug,
}: {
  cls: NonNullable<ReturnType<typeof getClassFull>>;
  slug: string;
}) {
  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${cls.name_pt} — Classe D&D 5e`,
    headline: `${cls.name_pt} — Classe D&D 5e`,
    description: `${cls.name_pt}: ${cls.description_pt}`,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://pocketdm.com.br",
      logo: {
        "@type": "ImageObject",
        url: "https://pocketdm.com.br/icons/icon-512.png",
      },
    },
    inLanguage: "pt-BR",
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://pocketdm.com.br",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Classes",
        item: "https://pocketdm.com.br/classes-pt",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cls.name_pt,
        item: `https://pocketdm.com.br/classes-pt/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default async function ClassDetailPtPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cls = getClassFull(slug);
  if (!cls) notFound();

  const subclasses = getSubclassesForClass(cls.id);

  return (
    <>
      <ClassJsonLd cls={cls} slug={slug} />

      <div className="min-h-screen bg-background">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[
            { label: "Classes", href: "/classes-pt" },
            { label: cls.name_pt },
          ]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicClassFullDetail
            cls={cls}
            subclasses={subclasses}
            locale="pt-BR"
          />

          <p className="text-xs text-gray-500 mt-8 text-center">
            Página disponível em{" "}
            <Link href={`/classes/${slug}`} className="text-gold hover:underline">
              English
            </Link>
          </p>

          <div className="mt-8">
            <PublicCTA entityName={cls.name_pt} locale="pt-BR" compendiumHref="/app/compendium?tab=classes" />
          </div>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
