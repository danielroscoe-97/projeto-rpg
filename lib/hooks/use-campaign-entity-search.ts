"use client";

/**
 * useCampaignEntitySearch — flat searchable index of NPCs + Locations +
 * Factions + Quests for a campaign, fetched once on mount and filtered on
 * the client.
 *
 * Powers the `@`-mention popover in the EntityMentionEditor. Kept separate
 * from the per-entity hooks (`useCampaignNpcs`, etc.) because it only needs
 * name + id + a short subtitle — avoiding the heavier selects those hooks
 * perform and the side effects (links, notes) they fetch.
 *
 * MVP ranking: case-insensitive substring + lightweight prefix boost. We
 * already depend on `fuse.js` in package.json; if beta-tester feedback asks
 * for typo-tolerance we can swap this out with zero API changes.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { captureError } from "@/lib/errors/capture";
import type { MentionEntityType } from "@/lib/utils/mention-parser";

export interface SearchableEntity {
  type: MentionEntityType;
  id: string;
  name: string;
  /** e.g. location type, faction alignment, quest status. Short and neutral. */
  subtitle?: string;
}

interface UseCampaignEntitySearchResult {
  entities: SearchableEntity[];
  loading: boolean;
  search: (query: string) => SearchableEntity[];
}

interface NpcRow {
  id: string;
  name: string;
}
interface LocationRow {
  id: string;
  name: string;
  location_type: string | null;
}
interface FactionRow {
  id: string;
  name: string;
  alignment: string | null;
}
interface QuestRow {
  id: string;
  title: string;
  status: string | null;
}

/** Max results returned by `search` — PRD §7.8 specifies 8. */
const SEARCH_LIMIT = 8;

export function useCampaignEntitySearch(
  campaignId: string,
): UseCampaignEntitySearchResult {
  const [entities, setEntities] = useState<SearchableEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) {
      setEntities([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    const fetchAll = async () => {
      try {
        const [npcsRes, locationsRes, factionsRes, questsRes] = await Promise.all([
          supabase
            .from("campaign_npcs")
            .select("id, name")
            .eq("campaign_id", campaignId),
          supabase
            .from("campaign_locations")
            .select("id, name, location_type")
            .eq("campaign_id", campaignId),
          supabase
            .from("campaign_factions")
            .select("id, name, alignment")
            .eq("campaign_id", campaignId),
          supabase
            .from("campaign_quests")
            .select("id, title, status")
            .eq("campaign_id", campaignId),
        ]);

        if (cancelled) return;

        const flat: SearchableEntity[] = [];

        if (npcsRes.error) {
          captureError(npcsRes.error, {
            component: "useCampaignEntitySearch",
            action: "fetch.npcs",
            category: "network",
          });
        } else {
          for (const row of (npcsRes.data ?? []) as NpcRow[]) {
            flat.push({ type: "npc", id: row.id, name: row.name });
          }
        }

        if (locationsRes.error) {
          captureError(locationsRes.error, {
            component: "useCampaignEntitySearch",
            action: "fetch.locations",
            category: "network",
          });
        } else {
          for (const row of (locationsRes.data ?? []) as LocationRow[]) {
            flat.push({
              type: "location",
              id: row.id,
              name: row.name,
              subtitle: row.location_type ?? undefined,
            });
          }
        }

        if (factionsRes.error) {
          captureError(factionsRes.error, {
            component: "useCampaignEntitySearch",
            action: "fetch.factions",
            category: "network",
          });
        } else {
          for (const row of (factionsRes.data ?? []) as FactionRow[]) {
            flat.push({
              type: "faction",
              id: row.id,
              name: row.name,
              subtitle: row.alignment ?? undefined,
            });
          }
        }

        if (questsRes.error) {
          captureError(questsRes.error, {
            component: "useCampaignEntitySearch",
            action: "fetch.quests",
            category: "network",
          });
        } else {
          for (const row of (questsRes.data ?? []) as QuestRow[]) {
            flat.push({
              type: "quest",
              id: row.id,
              name: row.title,
              subtitle: row.status ?? undefined,
            });
          }
        }

        setEntities(flat);
      } catch (err) {
        if (cancelled) return;
        captureError(err, {
          component: "useCampaignEntitySearch",
          action: "fetchAll",
          category: "network",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    void fetchAll();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const normalized = useMemo(
    () =>
      entities.map((e) => ({
        entity: e,
        needle: e.name.toLowerCase(),
      })),
    [entities],
  );

  const search = useCallback(
    (query: string): SearchableEntity[] => {
      const q = query.trim().toLowerCase();
      if (q.length === 0) {
        // No query → show a stable alphabetical slice so the popover feels
        // populated the instant it opens.
        return [...entities]
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, SEARCH_LIMIT);
      }

      const scored: Array<{ entity: SearchableEntity; score: number }> = [];
      for (const item of normalized) {
        const idx = item.needle.indexOf(q);
        if (idx === -1) continue;
        // Lower score = better. Prefix wins over mid-string. Shorter names
        // with the same prefix position rank above longer names.
        const score = idx * 1000 + item.needle.length;
        scored.push({ entity: item.entity, score });
      }
      scored.sort((a, b) => a.score - b.score);
      return scored.slice(0, SEARCH_LIMIT).map((s) => s.entity);
    },
    [entities, normalized],
  );

  return { entities, loading, search };
}
