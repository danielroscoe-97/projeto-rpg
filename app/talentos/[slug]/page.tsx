import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFeatDetail } from "@/components/public/PublicFeatDetail";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getSrdFeats, getFeatBySlug } from "@/lib/srd/srd-data-server";
import { featMetadata, articleLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

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
  return featMetadata(feat, { slug, locale: "pt-BR" });
}

function FeatJsonLd({ feat, slug }: { feat: { name: string; prerequisite: string | null }; slug: string }) {
  const name = `${feat.name} — Talento D&D 5e`;
  const description = `${feat.name}${feat.prerequisite ? ` (Pré-requisito: ${feat.prerequisite})` : ""}. Talento SRD do D&D 5e.`;
  const path = `/talentos/${slug}`;

  const jsonLdArticle = articleLd({
    name,
    description,
    path,
    imagePath: `/opengraph-image`,
    locale: "pt-BR",
  });

  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Início", path: "/" },
    { name: "Talentos", path: "/talentos" },
    { name: feat.name, path },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLdArticle)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
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
