import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFeatDetail } from "@/components/public/PublicFeatDetail";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getSrdFeats, getFeatBySlug } from "@/lib/srd/srd-data-server";

export function generateStaticParams() {
  return getSrdFeats().map((f) => ({ slug: f.id }));
}

export const dynamicParams = false;
export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feat = getFeatBySlug(slug);
  if (!feat) return { title: "Feat Not Found" };

  const title = `${feat.name} — D&D 5e Feat`;
  const description = `${feat.name}${feat.prerequisite ? ` (Prerequisite: ${feat.prerequisite})` : ""}. ${feat.description.slice(0, 140)}…`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `https://pocketdm.com.br/feats/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `https://pocketdm.com.br/feats/${slug}`,
      languages: {
        en: `https://pocketdm.com.br/feats/${slug}`,
        "pt-BR": `https://pocketdm.com.br/talentos/${slug}`,
      },
    },
  };
}

function FeatJsonLd({ feat, slug }: { feat: { name: string; description: string; prerequisite: string | null }; slug: string }) {
  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${feat.name} — D&D 5e Feat`,
    headline: `${feat.name} — D&D 5e Feat`,
    description: `${feat.name}${feat.prerequisite ? ` (Prerequisite: ${feat.prerequisite})` : ""}. D&D 5e SRD feat.`,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://www.pocketdm.com.br",
      logo: { "@type": "ImageObject", url: "https://pocketdm.com.br/icons/icon-512.png" },
    },
    inLanguage: "en",
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pocketdm.com.br" },
      { "@type": "ListItem", position: 2, name: "Feats", item: "https://pocketdm.com.br/feats" },
      { "@type": "ListItem", position: 3, name: feat.name, item: `https://pocketdm.com.br/feats/${slug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb).replace(/</g, "\\u003c") }}
      />
    </>
  );
}

export default async function FeatDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feat = getFeatBySlug(slug);
  if (!feat) notFound();

  const serialized = {
    id: feat.id,
    name: feat.name,
    description: feat.description,
    prerequisite: feat.prerequisite,
    source: feat.source,
    ruleset_version: feat.ruleset_version,
  };

  return (
    <>
      <FeatJsonLd feat={feat} slug={slug} />

      <div className="min-h-screen bg-background">
        <PublicNav
          breadcrumbs={[
            { label: "Feats", href: "/feats" },
            { label: feat.name },
          ]}
        />

        <main className="mx-auto max-w-4xl px-4 py-8">
          <PublicFeatDetail feat={serialized} locale="en" />

          <div className="mt-12">
            <PublicCTA entityName={feat.name} locale="en" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Also available in{" "}
            <Link href={`/talentos/${slug}`} className="text-gold hover:underline">
              Português
            </Link>
          </p>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
