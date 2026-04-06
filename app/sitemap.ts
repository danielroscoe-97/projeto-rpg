import type { MetadataRoute } from "next";
import {
  getSrdMonstersDeduped,
  getSrdSpellsDeduped,
  toSlug,
  toMonsterSlugPt,
  toSpellSlugPt,
} from "@/lib/srd/srd-data-server";
import { getRaceSlugs } from "@/lib/srd/races-data";
import { BLOG_POSTS } from "@/lib/blog/posts";
import classesData from "@/data/srd/classes-srd.json";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pocketdm.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // ── Static pages ─────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/try`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/methodology`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/methodology/spell-tiers`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  // ── Compendium indexes (EN) ──────────────────────────────────────
  const compendiumEN: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/monsters`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/spells`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/races`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/classes`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/conditions`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/diseases`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/damage-types`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/dice`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/rules`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/actions`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/ability-scores`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/encounter-builder`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];

  // ── Compendium indexes (PT-BR) ──────────────────────────────────
  const compendiumPT: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/monstros`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/magias`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/racas`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/condicoes`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/doencas`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/tipos-de-dano`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/dados`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/regras`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/acoes-em-combate`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/atributos`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/calculadora-encontro`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];

  // ── Legal ────────────────────────────────────────────────────────
  const legalPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/legal/attribution`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // ── Monster detail pages (EN + PT-BR, SRD only) ─────────────────
  const monsters = getSrdMonstersDeduped();
  const monsterPagesEN: MetadataRoute.Sitemap = monsters.map((m) => ({
    url: `${BASE_URL}/monsters/${toSlug(m.name)}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  const monsterPagesPT: MetadataRoute.Sitemap = monsters.map((m) => ({
    url: `${BASE_URL}/monstros/${toMonsterSlugPt(toSlug(m.name))}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // ── Spell detail pages (EN + PT-BR, SRD only) ───────────────────
  const spells = getSrdSpellsDeduped();
  const spellPagesEN: MetadataRoute.Sitemap = spells.map((s) => ({
    url: `${BASE_URL}/spells/${toSlug(s.name)}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  const spellPagesPT: MetadataRoute.Sitemap = spells.map((s) => ({
    url: `${BASE_URL}/magias/${toSpellSlugPt(toSlug(s.name))}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // ── Race detail pages (EN + PT-BR) ──────────────────────────────
  const raceSlugs = getRaceSlugs();
  const racePagesEN: MetadataRoute.Sitemap = raceSlugs.map((slug) => ({
    url: `${BASE_URL}/races/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  const racePagesPT: MetadataRoute.Sitemap = raceSlugs.map((slug) => ({
    url: `${BASE_URL}/racas/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // ── Class detail pages (EN only — no PT-BR route) ───────────────
  const classPages: MetadataRoute.Sitemap = classesData.map((c: { id: string }) => ({
    url: `${BASE_URL}/classes/${c.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // ── Blog ─────────────────────────────────────────────────────────
  const blogIndex: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 },
  ];
  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...compendiumEN,
    ...compendiumPT,
    ...legalPages,
    ...blogIndex,
    ...blogPages,
    ...monsterPagesEN,
    ...monsterPagesPT,
    ...spellPagesEN,
    ...spellPagesPT,
    ...racePagesEN,
    ...racePagesPT,
    ...classPages,
  ];
}
