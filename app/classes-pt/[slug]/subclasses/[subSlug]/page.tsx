import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicSubclassDetail } from "@/components/public/PublicSubclassDetail";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  getClassFull,
  getAllClassesFull,
  getSubclass,
} from "@/lib/srd/class-data-server";

// ── Static generation ──────────────────────────────────────────────
export async function generateStaticParams() {
  const params: { slug: string; subSlug: string }[] = [];
  for (const cls of getAllClassesFull()) {
    for (const subId of cls.subclass_ids ?? []) {
      params.push({ slug: cls.id, subSlug: subId });
    }
  }
  return params;
}

export const revalidate = 86400;

// ── Metadata ───────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
}): Promise<Metadata> {
  const { slug, subSlug } = await params;
  const cls = getClassFull(slug);
  const sub = getSubclass(subSlug);
  if (!cls || !sub) return { title: "Subclasse Não Encontrada" };

  const title = `${sub.name_pt} — Subclasse de ${cls.name_pt} | D&D 5e`;
  const description = `${sub.name_pt}: subclasse de ${cls.name_pt} no D&D 5e. ${sub.description_pt}`;

  return {
    title,
    description,
    keywords: [
      `${sub.name_pt} 5e`,
      `${sub.name_pt} ${cls.name_pt}`,
      `subclasse ${cls.name_pt}`,
      "subclasses D&D 5e",
    ],
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `https://pocketdm.com.br/classes-pt/${slug}/subclasses/${subSlug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `https://pocketdm.com.br/classes-pt/${slug}/subclasses/${subSlug}`,
      languages: {
        en: `https://pocketdm.com.br/classes/${slug}/subclasses/${subSlug}`,
        "pt-BR": `https://pocketdm.com.br/classes-pt/${slug}/subclasses/${subSlug}`,
      },
    },
  };
}

// ── JSON-LD ────────────────────────────────────────────────────────
function SubclassJsonLd({
  cls,
  sub,
  slug,
  subSlug,
}: {
  cls: NonNullable<ReturnType<typeof getClassFull>>;
  sub: NonNullable<ReturnType<typeof getSubclass>>;
  slug: string;
  subSlug: string;
}) {
  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${sub.name_pt} — Subclasse de ${cls.name_pt}`,
    headline: `${sub.name_pt} — Subclasse de ${cls.name_pt} | D&D 5e`,
    description: `${sub.name_pt}: ${sub.description_pt}`,
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
      {
        "@type": "ListItem",
        position: 4,
        name: sub.name_pt,
        item: `https://pocketdm.com.br/classes-pt/${slug}/subclasses/${subSlug}`,
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
export default async function SubclassDetailPtPage({
  params,
}: {
  params: Promise<{ slug: string; subSlug: string }>;
}) {
  const { slug, subSlug } = await params;
  const cls = getClassFull(slug);
  if (!cls) notFound();

  const sub = getSubclass(subSlug);
  if (!sub) notFound();

  return (
    <>
      <SubclassJsonLd cls={cls} sub={sub} slug={slug} subSlug={subSlug} />

      <div className="min-h-screen bg-background">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[
            { label: "Classes", href: "/classes-pt" },
            { label: cls.name_pt, href: `/classes-pt/${slug}` },
            { label: sub.name_pt },
          ]}
        />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <PublicSubclassDetail
          subclass={sub}
          parentClass={{
            id: cls.id,
            name: cls.name,
            name_pt: cls.name_pt,
            icon: cls.icon,
            subclass_name: cls.subclass_name,
            subclass_name_pt: cls.subclass_name_pt,
            subclass_level: cls.subclass_level,
          }}
          locale="pt-BR"
        />

        <p className="text-xs text-gray-500 mt-8 text-center">
          Página disponível em{" "}
          <Link
            href={`/classes/${slug}/subclasses/${subSlug}`}
            className="text-gold hover:underline"
          >
            English
          </Link>
        </p>

        <div className="mt-8">
          <PublicCTA entityName={sub.name_pt} locale="pt-BR" />
        </div>
      </main>

      <PublicFooter locale="pt-BR" />
    </div>
    </>
  );
}
