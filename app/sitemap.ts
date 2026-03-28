import type { MetadataRoute } from "next";
import { getSrdMonsters, getSrdSpells, toSlug } from "@/lib/srd/srd-data-server";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pocketdm.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/monsters`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/spells`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
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

  return [...staticPages, ...monsterPages, ...spellPages];
}
