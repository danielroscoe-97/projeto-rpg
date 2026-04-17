import type { MetadataRoute } from "next";
import {
  getSrdMonstersDeduped,
  getSrdSpellsDeduped,
  getSrdFeats,
  getSrdBackgrounds,
  getSrdItems,
  toSlug,
  toMonsterSlugPt,
  toSpellSlugPt,
} from "@/lib/srd/srd-data-server";
import { getRaceSlugs } from "@/lib/srd/races-data";
import { BLOG_POSTS } from "@/lib/blog/posts";
import classesData from "@/data/srd/classes-srd.json";
import subclassesData from "@/data/srd/subclasses-srd.json";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pocketdm.com.br";

// SRD content is a static snapshot of the SRD 5.1 — it does not change between
// deploys unless the bundles are regenerated. Use the last SRD regeneration
// date so Google does not rediscover 2,000+ URLs as "changed" on every deploy.
const SRD_LAST_UPDATED = new Date("2026-04-10");

// Build time for static pages — tied to deploy, not request time.
const BUILD_TIME = new Date();

type SitemapEntry = MetadataRoute.Sitemap[number];

export default function sitemap(): MetadataRoute.Sitemap {
  // ── Static pages ─────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: BUILD_TIME, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: BUILD_TIME, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: BUILD_TIME, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/faq`, lastModified: BUILD_TIME, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/try`, lastModified: BUILD_TIME, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/methodology`, lastModified: BUILD_TIME, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/methodology/spell-tiers`, lastModified: BUILD_TIME, changeFrequency: "monthly", priority: 0.5 },
  ];

  // ── Compendium indexes (EN) ──────────────────────────────────────
  const compendiumEN: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/monsters`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/spells`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/races`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/classes`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/feats`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/backgrounds`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/items`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/conditions`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/diseases`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/damage-types`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/dice`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/rules`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/actions`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/ability-scores`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/encounter-builder`, lastModified: BUILD_TIME, changeFrequency: "monthly", priority: 0.9 },
  ];

  // ── Compendium indexes (PT-BR) ──────────────────────────────────
  const compendiumPT: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/monstros`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/magias`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/racas`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/classes-pt`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/talentos`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/antecedentes`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/itens`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/condicoes`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/doencas`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/tipos-de-dano`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/dados`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/regras`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/acoes-em-combate`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/atributos`, lastModified: SRD_LAST_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/calculadora-encontro`, lastModified: BUILD_TIME, changeFrequency: "monthly", priority: 0.9 },
  ];

  // ── Legal ────────────────────────────────────────────────────────
  const legalPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/legal/privacy`, lastModified: BUILD_TIME, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/legal/terms`, lastModified: BUILD_TIME, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/legal/attribution`, lastModified: BUILD_TIME, changeFrequency: "yearly", priority: 0.3 },
  ];

  // ── E-books ──────────────────────────────────────────────────────
  const ebookPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/ebook/guia-mestre-eficaz`, lastModified: BUILD_TIME, changeFrequency: "monthly", priority: 0.8 },
  ];

  // ── Blog ─────────────────────────────────────────────────────────
  const blogIndex: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/blog`, lastModified: BUILD_TIME, changeFrequency: "weekly", priority: 0.8 },
  ];
  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "yearly" as const,
    priority: 0.7,
  }));

  // ── SRD detail pages — static content, low change frequency ─────
  // Priority 0.5 so they don't cannibalize crawl budget from indexes/blog.
  const srdDetail = (url: string): SitemapEntry => ({
    url,
    lastModified: SRD_LAST_UPDATED,
    changeFrequency: "yearly",
    priority: 0.5,
  });

  const monsters = getSrdMonstersDeduped();
  const monsterPagesEN: MetadataRoute.Sitemap = monsters.map((m) =>
    srdDetail(`${BASE_URL}/monsters/${toSlug(m.name)}`),
  );
  const monsterPagesPT: MetadataRoute.Sitemap = monsters.map((m) =>
    srdDetail(`${BASE_URL}/monstros/${toMonsterSlugPt(toSlug(m.name))}`),
  );

  const spells = getSrdSpellsDeduped();
  const spellPagesEN: MetadataRoute.Sitemap = spells.map((s) =>
    srdDetail(`${BASE_URL}/spells/${toSlug(s.name)}`),
  );
  const spellPagesPT: MetadataRoute.Sitemap = spells.map((s) =>
    srdDetail(`${BASE_URL}/magias/${toSpellSlugPt(toSlug(s.name))}`),
  );

  const raceSlugs = getRaceSlugs();
  const racePagesEN: MetadataRoute.Sitemap = raceSlugs.map((slug) =>
    srdDetail(`${BASE_URL}/races/${slug}`),
  );
  const racePagesPT: MetadataRoute.Sitemap = raceSlugs.map((slug) =>
    srdDetail(`${BASE_URL}/racas/${slug}`),
  );

  const classPages: MetadataRoute.Sitemap = classesData.map((c: { id: string }) =>
    srdDetail(`${BASE_URL}/classes/${c.id}`),
  );
  const classPagesPT: MetadataRoute.Sitemap = classesData.map((c: { id: string }) =>
    srdDetail(`${BASE_URL}/classes-pt/${c.id}`),
  );

  const subclassPages: MetadataRoute.Sitemap = (
    subclassesData as Array<{ id: string; class_id: string }>
  ).map((s) => srdDetail(`${BASE_URL}/classes/${s.class_id}/subclasses/${s.id}`));
  const subclassPagesPT: MetadataRoute.Sitemap = (
    subclassesData as Array<{ id: string; class_id: string }>
  ).map((s) => srdDetail(`${BASE_URL}/classes-pt/${s.class_id}/subclasses/${s.id}`));

  const feats = getSrdFeats();
  const featPagesEN: MetadataRoute.Sitemap = feats.map((f) =>
    srdDetail(`${BASE_URL}/feats/${f.id}`),
  );
  const featPagesPT: MetadataRoute.Sitemap = feats.map((f) =>
    srdDetail(`${BASE_URL}/talentos/${f.id}`),
  );

  const backgrounds = getSrdBackgrounds();
  const backgroundPagesEN: MetadataRoute.Sitemap = backgrounds.map((b) =>
    srdDetail(`${BASE_URL}/backgrounds/${b.id}`),
  );
  const backgroundPagesPT: MetadataRoute.Sitemap = backgrounds.map((b) =>
    srdDetail(`${BASE_URL}/antecedentes/${b.id}`),
  );

  const items = getSrdItems();
  const itemPagesEN: MetadataRoute.Sitemap = items.map((i) =>
    srdDetail(`${BASE_URL}/items/${i.id}`),
  );
  const itemPagesPT: MetadataRoute.Sitemap = items.map((i) =>
    srdDetail(`${BASE_URL}/itens/${i.id}`),
  );

  return [
    ...staticPages,
    ...compendiumEN,
    ...compendiumPT,
    ...legalPages,
    ...ebookPages,
    ...blogIndex,
    ...blogPages,
    ...monsterPagesEN,
    ...monsterPagesPT,
    ...spellPagesEN,
    ...spellPagesPT,
    ...racePagesEN,
    ...racePagesPT,
    ...classPages,
    ...classPagesPT,
    ...subclassPages,
    ...subclassPagesPT,
    ...featPagesEN,
    ...featPagesPT,
    ...backgroundPagesEN,
    ...backgroundPagesPT,
    ...itemPagesEN,
    ...itemPagesPT,
  ];
}
