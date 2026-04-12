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
  if (!feat) return { title: "Talento Não Encontrado" };

  const title = `${feat.name} — Talento D&D 5e`;
  const description = `${feat.name}${feat.prerequisite ? ` (Pré-requisito: ${feat.prerequisite})` : ""}. ${feat.description.slice(0, 140)}…`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Pocket DM`,
      description,
      type: "article",
      url: `https://pocketdm.com.br/talentos/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Pocket DM`,
      description,
    },
    alternates: {
      canonical: `https://pocketdm.com.br/talentos/${slug}`,
      languages: {
        en: `https://pocketdm.com.br/feats/${slug}`,
        "pt-BR": `https://pocketdm.com.br/talentos/${slug}`,
      },
    },
  };
}

function FeatJsonLd({ feat, slug }: { feat: { name: string; prerequisite: string | null }; slug: string }) {
  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: `${feat.name} — Talento D&D 5e`,
    headline: `${feat.name} — Talento D&D 5e`,
    description: `${feat.name}${feat.prerequisite ? ` (Pré-requisito: ${feat.prerequisite})` : ""}. Talento SRD do D&D 5e.`,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://www.pocketdm.com.br",
      logo: { "@type": "ImageObject", url: "https://pocketdm.com.br/icons/icon-512.png" },
    },
    inLanguage: "pt-BR",
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pocketdm.com.br" },
      { "@type": "ListItem", position: 2, name: "Talentos", item: "https://pocketdm.com.br/talentos" },
      { "@type": "ListItem", position: 3, name: feat.name, item: `https://pocketdm.com.br/talentos/${slug}` },
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

export default async function TalentoDetailPage({
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
          locale="pt-BR"
          breadcrumbs={[
            { label: "Talentos", href: "/talentos" },
            { label: feat.name },
          ]}
        />

        <main className="mx-auto max-w-4xl px-4 py-8">
          <PublicFeatDetail feat={serialized} locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName={feat.name} locale="pt-BR" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href={`/feats/${slug}`} className="text-gold hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
