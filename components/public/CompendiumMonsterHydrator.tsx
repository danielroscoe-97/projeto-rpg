"use client";

import { useMemo } from "react";
import { useSrdStore } from "@/lib/stores/srd-store";
import { PublicMonsterGrid } from "./PublicMonsterGrid";
import { toSlug } from "@/lib/utils/monster";

interface MonsterEntry {
  name: string;
  nameEn?: string;
  namePt?: string;
  cr: string;
  type: string;
  isMAD?: boolean;
  slug?: string;
  tokenUrl?: string;
  fallbackTokenUrl?: string;
}

interface Props {
  ssrMonsters: MonsterEntry[];
  /** EN slug → PT display name */
  ptNameMap: Record<string, string>;
  /** EN slug → PT slug (for PT URLs) */
  ptSlugMap: Record<string, string>;
  basePath?: string;
  locale?: "en" | "pt-BR";
  labels?: {
    searchPlaceholder?: string;
    crLabel?: string;
    typeLabel?: string;
    noResults?: string;
    clearAll?: string;
    of?: string;
    monsters?: string;
    filters?: string;
  };
}

/**
 * Client-side hydrator that upgrades the SSR monster grid for beta testers.
 *
 * - Public/guest visitors see the SSR data (SRD-only, deduplicated)
 * - Beta testers see the full dataset from the SRD store (all books)
 *
 * The PublicSrdBridge (in PublicNavClient) handles detecting beta access
 * and switching the SRD store to full mode. This component simply reads
 * the store and swaps the data when full mode is active.
 */
export function CompendiumMonsterHydrator({
  ssrMonsters,
  ptNameMap,
  ptSlugMap,
  basePath = "/monsters",
  locale = "en",
  labels,
}: Props) {
  const storeMonsters = useSrdStore((s) => s.monsters);
  const loadedMode = useSrdStore((s) => s.loadedMode);

  const monsters = useMemo(() => {
    if (loadedMode !== "full" || storeMonsters.length === 0) {
      return ssrMonsters;
    }

    const isPt = locale === "pt-BR";

    return storeMonsters.map((m) => {
      const enSlug = toSlug(m.name);
      const ptName = ptNameMap[enSlug] ?? m.name;
      return {
        name: isPt ? ptName : m.name,
        nameEn: m.name,
        namePt: ptName,
        cr: m.cr,
        type: m.type,
        isMAD: !!m.monster_a_day_url,
        slug: isPt ? (ptSlugMap[enSlug] ?? enSlug) : enSlug,
        tokenUrl: m.token_url,
        fallbackTokenUrl: m.fallback_token_url,
      };
    });
  }, [storeMonsters, loadedMode, ssrMonsters, ptNameMap, ptSlugMap, locale]);

  return (
    <PublicMonsterGrid
      monsters={monsters}
      basePath={basePath}
      locale={locale}
      labels={labels}
    />
  );
}
