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
import { articleLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

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
      url: `/classes-pt/${slug}/subclasses/${subSlug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `/classes-pt/${slug}/subclasses/${subSlug}`,
      languages: {
        en: `/classes/${slug}/subclasses/${subSlug}`,
        "pt-BR": `/classes-pt/${slug}/subclasses/${subSlug}`,
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
  const name = `${sub.name_pt} — Subclasse de ${cls.name_pt} | D&D 5e`;
  const description = `${sub.name_pt}: ${sub.description_pt}`;
  const path = `/classes-pt/${slug}/subclasses/${subSlug}`;

  const jsonLdArticle = articleLd({
    name,
    description,
    path,
    imagePath: "/opengraph-image",
    locale: "pt-BR",
  });

  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Início", path: "/" },
    { name: "Classes", path: "/classes-pt" },
    { name: cls.name_pt, path: `/classes-pt/${slug}` },
    { name: sub.name_pt, path },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLdArticle)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
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
