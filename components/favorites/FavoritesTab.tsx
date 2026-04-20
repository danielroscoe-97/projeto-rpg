"use client";

/**
 * S5.2 — Favorites tab content for the compendium.
 *
 * Loads the user's favorites for all three kinds (monster/item/condition),
 * hydrates against the in-memory SRD store, and renders a unified card list
 * with an empty state when there are none.
 *
 * Only mounted when `ff_favorites_v1` is ON. The empty state drives the
 * `favorites:tab_opened` telemetry once per mount.
 */

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { HeartPulse, Skull, Sword } from "lucide-react";
import { trackEvent } from "@/lib/analytics/track";
import { useFavorites } from "@/lib/favorites/use-favorites";
import { FavoriteStar } from "@/components/favorites/FavoriteStar";
import { favoriteSlug as slugify } from "@/lib/favorites/slug";
import type { SrdMonster, SrdItem, SrdCondition } from "@/lib/srd/srd-loader";

type Row =
  | { kind: "monster"; slug: string; name: string; monster: SrdMonster }
  | { kind: "item"; slug: string; name: string; item: SrdItem }
  | { kind: "condition"; slug: string; name: string; condition: SrdCondition };

export interface FavoritesTabProps {
  monsters: SrdMonster[];
  items: SrdItem[];
  conditions: SrdCondition[];
  onSelectMonster?: (m: SrdMonster) => void;
  onSelectItem?: (i: SrdItem) => void;
  onSelectCondition?: (c: SrdCondition) => void;
}

export function FavoritesTab({
  monsters,
  items,
  conditions,
  onSelectMonster,
  onSelectItem,
  onSelectCondition,
}: FavoritesTabProps) {
  const t = useTranslations("favorites");
  const { favorites: monsterFavs } = useFavorites("monster");
  const { favorites: itemFavs } = useFavorites("item");
  const { favorites: conditionFavs } = useFavorites("condition");

  const monsterBySlug = useMemo(() => {
    const m = new Map<string, SrdMonster>();
    for (const mon of monsters) m.set(slugify(mon.name), mon);
    return m;
  }, [monsters]);

  const itemBySlug = useMemo(() => {
    const m = new Map<string, SrdItem>();
    for (const it of items) m.set(slugify(it.name), it);
    return m;
  }, [items]);

  const conditionBySlug = useMemo(() => {
    const m = new Map<string, SrdCondition>();
    for (const c of conditions) m.set(slugify(c.name), c);
    return m;
  }, [conditions]);

  const rows = useMemo((): Row[] => {
    const out: Row[] = [];
    for (const f of monsterFavs) {
      const monster = monsterBySlug.get(f.slug);
      if (monster) out.push({ kind: "monster", slug: f.slug, name: monster.name, monster });
    }
    for (const f of itemFavs) {
      const item = itemBySlug.get(f.slug);
      if (item) out.push({ kind: "item", slug: f.slug, name: item.name, item });
    }
    for (const f of conditionFavs) {
      const cond = conditionBySlug.get(f.slug);
      if (cond) out.push({ kind: "condition", slug: f.slug, name: cond.name, condition: cond });
    }
    return out;
  }, [monsterFavs, itemFavs, conditionFavs, monsterBySlug, itemBySlug, conditionBySlug]);

  // Telemetry — fire once per mount with the resolved count.
  useEffect(() => {
    trackEvent("favorites:tab_opened", { count: rows.length });
    // only on mount; count is read at mount intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center text-muted-foreground">
        <span className="text-4xl" aria-hidden="true">⭐</span>
        <p className="text-sm max-w-xs">{t("empty_state")}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/5">
      {rows.map((row) => (
        <li key={`${row.kind}:${row.slug}`} className="flex items-center gap-2 px-3 py-2">
          <KindIcon kind={row.kind} />
          <button
            type="button"
            onClick={() => {
              if (row.kind === "monster") onSelectMonster?.(row.monster);
              else if (row.kind === "item") onSelectItem?.(row.item);
              else onSelectCondition?.(row.condition);
            }}
            className="flex-1 text-left text-sm text-foreground hover:text-gold transition-colors truncate"
          >
            {row.name}
          </button>
          <FavoriteStar kind={row.kind} slug={row.slug} name={row.name} compact />
        </li>
      ))}
    </ul>
  );
}

function KindIcon({ kind }: { kind: "monster" | "item" | "condition" }) {
  if (kind === "monster") return <Skull className="w-4 h-4 text-red-400/70 shrink-0" aria-hidden />;
  if (kind === "item") return <Sword className="w-4 h-4 text-amber-400/70 shrink-0" aria-hidden />;
  return <HeartPulse className="w-4 h-4 text-emerald-400/70 shrink-0" aria-hidden />;
}

