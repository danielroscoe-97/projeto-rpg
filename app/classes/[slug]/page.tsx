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
  if (!cls) return { title: "Class Not Found" };

  const subclasses = getSubclassesForClass(cls.id);
  const subclassNames = subclasses.map((s) => s.name).join(", ");

  const title = `${cls.name} — D&D 5e Class Guide`;
  const description = `${cls.name}: ${cls.description_en} Hit Die: ${cls.hit_die}. Primary Ability: ${cls.primary_ability}. Subclasses: ${subclassNames || cls.srd_subclass}. Full class features, progression table, and starting equipment.`;

  return {
    title,
    description,
    keywords: [
      `${cls.name} 5e`,
      `D&D ${cls.name}`,
      `${cls.name} class`,
      `${cls.name} guide`,
      `${cls.name} hit die`,
      `${cls.name} subclasses`,
      `${cls.name} class features`,
      `${cls.name} build`,
      cls.srd_subclass,
      ...subclasses.map((s) => `${s.name} 5e`),
      "D&D 5e classes",
      "SRD class",
      "D&D class guide",
    ],
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `https://pocketdm.com.br/classes/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `https://pocketdm.com.br/classes/${slug}`,
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
    name: `${cls.name} — D&D 5e Class Guide`,
    headline: `${cls.name} — D&D 5e Class Guide`,
    description: `${cls.name}: ${cls.description_en} Hit Die: ${cls.hit_die}. Primary Ability: ${cls.primary_ability}.`,
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
    inLanguage: "en",
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
        item: "https://pocketdm.com.br/classes",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cls.name,
        item: `https://pocketdm.com.br/classes/${slug}`,
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
            <Link href={`/classes-pt/${slug}`} className="text-[#D4A853] hover:underline">
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
