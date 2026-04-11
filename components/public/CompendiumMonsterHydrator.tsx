"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useContentAccess } from "@/lib/hooks/use-content-access";
import { PublicMonsterGrid } from "./PublicMonsterGrid";
import { toSlug } from "@/lib/utils/monster";
import type { SrdMonster } from "@/lib/srd/srd-loader";

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
 * - Beta testers see the full dataset fetched directly from /api/srd/full/
 *
 * Uses useContentAccess() to detect beta access, then fetches monster data
 * directly from the auth-gated API — no dependency on the SRD store chain.
 */
export function CompendiumMonsterHydrator({
  ssrMonsters,
  ptNameMap,
  ptSlugMap,
  basePath = "/monsters",
  locale = "en",
  labels,
}: Props) {
  const { canAccess, isLoading } = useContentAccess();
  const [fullMonsters, setFullMonsters] = useState<SrdMonster[] | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (isLoading || !canAccess || fetchedRef.current) return;
    fetchedRef.current = true;

    Promise.all([
      fetch("/api/srd/full/monsters-2014.json").then((r) =>
        r.ok ? (r.json() as Promise<SrdMonster[]>) : ([] as SrdMonster[])
      ),
      fetch("/api/srd/full/monsters-2024.json").then((r) =>
        r.ok ? (r.json() as Promise<SrdMonster[]>) : ([] as SrdMonster[])
      ),
      fetch("/api/srd/full/monsters-mad.json").then((r) =>
        r.ok ? (r.json() as Promise<SrdMonster[]>) : ([] as SrdMonster[])
      ),
    ])
      .then(([m2014, m2024, mad]) => {
        setFullMonsters([...m2014, ...m2024, ...mad]);
      })
      .catch(() => {
        // Fetch failed — stay with SSR data
      });
  }, [canAccess, isLoading]);

  const monsters = useMemo(() => {
    if (!fullMonsters || fullMonsters.length === 0) {
      return ssrMonsters;
    }

    const isPt = locale === "pt-BR";

    return fullMonsters.map((m) => {
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
  }, [fullMonsters, ssrMonsters, ptNameMap, ptSlugMap, locale]);

  return (
    <PublicMonsterGrid
      monsters={monsters}
      basePath={basePath}
      locale={locale}
      labels={labels}
    />
  );
}
