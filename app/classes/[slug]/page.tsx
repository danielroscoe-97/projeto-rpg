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
import { articleLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

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
  if (!cls) return { title: "Class Not Found" };

  const subclasses = getSubclassesForClass(cls.id);
  const subclassNames = subclasses.map((s) => s.name).join(", ");

  const title = `${cls.name} — D&D 5e Class Guide`;
  const description = `${cls.name}: ${cls.description_en} Hit Die: ${cls.hit_die}. Primary Ability: ${cls.primary_ability}. Subclasses: ${subclassNames || cls.srd_subclass}. Full class features, progression table, and starting equipment.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `/classes/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `/classes/${slug}`,
      languages: {
        en: `/classes/${slug}`,
        "pt-BR": `/classes-pt/${slug}`,
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
  const name = `${cls.name} — D&D 5e Class Guide`;
  const description = `${cls.name}: ${cls.description_en} Hit Die: ${cls.hit_die}. Primary Ability: ${cls.primary_ability}.`;
  const path = `/classes/${slug}`;

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
    { name: cls.name, path },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLdArticle)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default async function ClassDetailPage({
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
          breadcrumbs={[
            { label: "Classes", href: "/classes" },
            { label: cls.name },
          ]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicClassFullDetail
            cls={cls}
            subclasses={subclasses}
            locale="en"
          />

          <p className="text-xs text-gray-500 mt-8 text-center">
            Also available in{" "}
            <Link href={`/classes-pt/${slug}`} className="text-gold hover:underline">
              Português
            </Link>
          </p>

          <div className="mt-8">
            <PublicCTA entityName={cls.name} locale="en" compendiumHref="/app/compendium?tab=classes" />
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
