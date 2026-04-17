import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFeatDetail } from "@/components/public/PublicFeatDetail";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getSrdFeats, getFeatBySlug } from "@/lib/srd/srd-data-server";
import { featMetadata, articleLd, breadcrumbList } from "@/lib/seo/metadata";

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
  return featMetadata(feat, { slug, locale: "en" });
}

function FeatJsonLd({ feat, slug }: { feat: { name: string; description: string; prerequisite: string | null }; slug: string }) {
  const name = `${feat.name} — D&D 5e Feat`;
  const description = `${feat.name}${feat.prerequisite ? ` (Prerequisite: ${feat.prerequisite})` : ""}. D&D 5e SRD feat.`;
  const path = `/feats/${slug}`;

  const jsonLdArticle = articleLd({
    name,
    description,
    path,
    imagePath: `/opengraph-image`,
    locale: "en",
  });

  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Home", path: "/" },
    { name: "Feats", path: "/feats" },
    { name: feat.name, path },
  ]);

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
