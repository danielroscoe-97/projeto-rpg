import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicBackgroundDetail } from "@/components/public/PublicBackgroundDetail";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getSrdBackgrounds, getBackgroundBySlug } from "@/lib/srd/srd-data-server";
import { backgroundMetadata, articleLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

export function generateStaticParams() {
  return getSrdBackgrounds().map((b) => ({ slug: b.id }));
}

export const dynamicParams = false;
export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bg = getBackgroundBySlug(slug);
  if (!bg) return { title: "Background Not Found" };
  return backgroundMetadata(bg, { slug, locale: "en" });
}

function BackgroundJsonLd({ bg, slug }: { bg: { name: string; skill_proficiencies: string[]; feature_name: string | null }; slug: string }) {
  const name = `${bg.name} — D&D 5e Background`;
  const description = `${bg.name}: ${bg.skill_proficiencies.join(", ")}${bg.feature_name ? `. Feature: ${bg.feature_name}` : ""}.`;
  const path = `/backgrounds/${slug}`;

  const jsonLdArticle = articleLd({
    name,
    description,
    path,
    imagePath: `/opengraph-image`,
    locale: "en",
  });

  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Home", path: "/" },
    { name: "Backgrounds", path: "/backgrounds" },
    { name: bg.name, path },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLdArticle)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
    </>
  );
}

export default async function BackgroundDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bg = getBackgroundBySlug(slug);
  if (!bg) notFound();

  const serialized = {
    id: bg.id,
    name: bg.name,
    description: bg.description,
    skill_proficiencies: bg.skill_proficiencies,
    tool_proficiencies: bg.tool_proficiencies,
    languages: bg.languages,
    equipment: bg.equipment,
    feature_name: bg.feature_name,
    feature_description: bg.feature_description,
    source: bg.source,
    ruleset_version: bg.ruleset_version,
  };

  return (
    <>
      <BackgroundJsonLd bg={bg} slug={slug} />

      <div className="min-h-screen bg-background">
        <PublicNav
          breadcrumbs={[
            { label: "Backgrounds", href: "/backgrounds" },
            { label: bg.name },
          ]}
        />

        <main className="mx-auto max-w-4xl px-4 py-8">
          <PublicBackgroundDetail background={serialized} locale="en" />

          <div className="mt-12">
            <PublicCTA entityName={bg.name} locale="en" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Also available in{" "}
            <Link href={`/antecedentes/${slug}`} className="text-gold hover:underline">
              Português
            </Link>
          </p>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
