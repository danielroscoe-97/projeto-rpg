import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicItemDetail } from "@/components/public/PublicItemDetail";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getSrdItems, getItemBySlug } from "@/lib/srd/srd-data-server";
import { itemMetadata, articleLd, breadcrumbList , jsonLdScriptProps} from "@/lib/seo/metadata";

export function generateStaticParams() {
  return getSrdItems()
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 200)
    .map((i) => ({ slug: i.id }));
}

export const dynamicParams = true;
export const revalidate = 86400;

function formatTypeName(type: string): string {
  return type.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const RARITY_PT: Record<string, string> = {
  none: "", common: "Comum", uncommon: "Incomum", rare: "Raro",
  "very rare": "Muito Raro", legendary: "Lendário", artifact: "Artefato",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = getItemBySlug(slug);
  if (!item) return { title: "Item Não Encontrado" };
  return itemMetadata(item, { slug, locale: "pt-BR" });
}

function ItemJsonLd({ item, slug }: { item: { name: string; type: string; rarity: string }; slug: string }) {
  const name = `${item.name} — Item D&D 5e`;
  const description = `${item.name}, ${formatTypeName(item.type)}${item.rarity !== "none" ? `, ${RARITY_PT[item.rarity] ?? item.rarity}` : ""}. Item SRD do D&D 5e.`;
  const path = `/itens/${slug}`;

  const jsonLdArticle = articleLd({
    name,
    description,
    path,
    imagePath: `/opengraph-image`,
    locale: "pt-BR",
  });

  const jsonLdBreadcrumb = breadcrumbList([
    { name: "Início", path: "/" },
    { name: "Itens", path: "/itens" },
    { name: item.name, path },
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(jsonLdArticle)} />
      <script {...jsonLdScriptProps(jsonLdBreadcrumb)} />
    </>
  );
}

export default async function ItemDetailPagePt({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getItemBySlug(slug);
  if (!item) notFound();

  const serialized = {
    id: item.id,
    name: item.name,
    type: item.type,
    rarity: item.rarity,
    isMagic: item.isMagic,
    entries: item.entries,
    value: item.value,
    weight: item.weight,
    reqAttune: item.reqAttune,
    edition: item.edition,
    ac: item.ac,
    dmg1: item.dmg1,
    dmgType: item.dmgType,
    property: item.property,
    range: item.range,
    weaponCategory: item.weaponCategory,
    charges: item.charges,
    recharge: item.recharge,
    bonusWeapon: item.bonusWeapon,
    bonusAc: item.bonusAc,
    curse: item.curse,
    sentient: item.sentient,
  };

  return (
    <>
      <ItemJsonLd item={item} slug={slug} />

      <div className="min-h-screen bg-background">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[
            { label: "Itens", href: "/itens" },
            { label: item.name },
          ]}
        />

        <main className="mx-auto max-w-4xl px-4 py-8">
          <PublicItemDetail item={serialized} locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName={item.name} locale="pt-BR" />
          </div>

          <p className="text-xs text-gray-500 mt-12 text-center">
            Página disponível em{" "}
            <Link href={`/items/${slug}`} className="text-gold hover:underline">
              English
            </Link>
          </p>
        </main>

        <PublicFooter locale="pt-BR" />
      </div>
    </>
  );
}
