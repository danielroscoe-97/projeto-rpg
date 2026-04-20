import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo/metadata";
import { HubPageTemplate } from "@/components/seo/HubPageTemplate";
import { hubSlugsForLocale, loadHub } from "@/lib/seo/hub-loader";

export const revalidate = 86400;

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
    locale: "pt-BR",
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
