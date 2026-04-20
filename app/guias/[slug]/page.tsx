import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo/metadata";
import { HubPageTemplate } from "@/components/seo/HubPageTemplate";
import { hubSlugsForLocale, loadHub } from "@/lib/seo/hub-loader";

export const revalidate = 86400;
// Unknown slugs return 404 at request time instead of attempting runtime
// filesystem reads (which could ENOENT in serverless or mask bad input).
export const dynamicParams = false;

export function generateStaticParams() {
  return hubSlugsForLocale("pt-BR").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const hub = loadHub(slug, "pt-BR");
  if (!hub) return {};
  return buildMetadata({
    title: hub.metaTitle,
    description: hub.metaDescription,
    path: `/guias/${hub.slug}`,
    alternatePath: hub.alternateSlug ? `/guides/${hub.alternateSlug}` : undefined,
    locale: "pt-BR",
    ogTitle: hub.ogTitle,
    ogDescription: hub.ogDescription,
  });
}

export default async function HubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hub = loadHub(slug, "pt-BR");
  if (!hub) notFound();
  return <HubPageTemplate content={hub} />;
}
