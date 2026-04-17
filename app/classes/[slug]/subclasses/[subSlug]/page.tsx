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
  if (!cls || !sub) return { title: "Subclass Not Found" };

  const title = `${sub.name} — ${cls.name} Subclass | D&D 5e`;
  const featureNames = sub.features.map((f) => f.name).join(", ");
  const description = `${sub.name} subclass for the ${cls.name} class in D&D 5e. ${sub.description_en} Features: ${featureNames}.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `/classes/${slug}/subclasses/${subSlug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `/classes/${slug}/subclasses/${subSlug}`,
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
  const name = `${sub.name} — ${cls.name} Subclass | D&D 5e`;
  const description = `${sub.name}: ${sub.description_en}`;
  const path = `/classes/${slug}/subclasses/${subSlug}`;

  const jsonLdArticle = articleLd({
    name,
    description,
    path,
    imagePath: "/opengraph-image",
    locale: "en",
  });

  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Home", path: "/" },
    { name: "Classes", path: "/classes" },
    { name: cls.name, path: `/classes/${slug}` },
    { name: sub.name, path },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLdArticle)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default async function SubclassDetailPage({
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
          breadcrumbs={[
            { label: "Classes", href: "/classes" },
            { label: cls.name, href: `/classes/${slug}` },
            { label: sub.name },
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
            locale="en"
          />

          <p className="text-xs text-gray-500 mt-8 text-center">
            Also available in{" "}
            <Link
              href={`/classes-pt/${slug}/subclasses/${subSlug}`}
              className="text-gold hover:underline"
            >
              Português
            </Link>
          </p>

          <div className="mt-8">
            <PublicCTA entityName={sub.name} locale="en" />
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
