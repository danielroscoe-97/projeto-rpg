import type { MetadataRoute } from "next";
import { getSrdMonsters, getSrdSpells, toSlug } from "@/lib/srd/srd-data-server";
import { BLOG_POSTS } from "@/lib/blog/posts";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pocketdm.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/monsters`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/spells`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/try`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Monster pages (SRD only)
  const monsterPages: MetadataRoute.Sitemap = getSrdMonsters().map((m) => ({
    url: `${BASE_URL}/monsters/${toSlug(m.name)}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Spell pages (SRD only)
  const spellPages: MetadataRoute.Sitemap = getSrdSpells().map((s) => ({
    url: `${BASE_URL}/spells/${toSlug(s.name)}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Blog pages
  const blogIndex: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 },
  ];
  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...blogIndex, ...blogPages, ...monsterPages, ...spellPages];
}
