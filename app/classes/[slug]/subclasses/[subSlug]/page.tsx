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
  if (!cls || !sub) return { title: "Subclass Not Found" };

  const title = `${sub.name} — ${cls.name} Subclass | D&D 5e`;
  const featureNames = sub.features.map((f) => f.name).join(", ");
  const description = `${sub.name} subclass for the ${cls.name} class in D&D 5e. ${sub.description_en} Features: ${featureNames}.`;

  return {
    title,
    description,
    keywords: [
      `${sub.name} 5e`,
      `${sub.name} ${cls.name}`,
      `${cls.name} subclass`,
      `D&D ${sub.name}`,
      `${sub.name} features`,
      `${sub.name} guide`,
      `${cls.subclass_name} 5e`,
      "D&D 5e subclasses",
      "SRD subclass",
    ],
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `https://pocketdm.com.br/classes/${slug}/subclasses/${subSlug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `https://pocketdm.com.br/classes/${slug}/subclasses/${subSlug}`,
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
    name: `${sub.name} — ${cls.name} Subclass`,
    headline: `${sub.name} — ${cls.name} Subclass | D&D 5e`,
    description: `${sub.name}: ${sub.description_en}`,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://www.pocketdm.com.br",
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
        item: "https://www.pocketdm.com.br",
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
      {
        "@type": "ListItem",
        position: 4,
        name: sub.name,
        item: `https://pocketdm.com.br/classes/${slug}/subclasses/${subSlug}`,
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
