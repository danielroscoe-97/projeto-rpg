import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo/metadata";
import { HubPageTemplate } from "@/components/seo/HubPageTemplate";
import { hubSlugsForLocale, loadHub } from "@/lib/seo/hub-loader";

export const revalidate = 86400;

export function generateStaticParams() {
  return hubSlugsForLocale("en").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const hub = loadHub(slug, "en");
  if (!hub) return {};
  return buildMetadata({
    title: hub.metaTitle,
    description: hub.metaDescription,
    path: `/guides/${hub.slug}`,
    locale: "en",
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
  const hub = loadHub(slug, "en");
  if (!hub) notFound();
  return <HubPageTemplate content={hub} />;
}
