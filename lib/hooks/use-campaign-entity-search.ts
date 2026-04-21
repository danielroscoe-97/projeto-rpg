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

/**
 * Strip diacritics so PT-BR users typing "vitor" match "Víctor". Also
 * pre-folds a small set of atomic code points (ß, ı, Ł, Ø, Æ, Đ) that NFD
 * doesn't decompose — otherwise "Straße" would never match "strasse".
 * Kept at module scope so it has a stable identity across renders (React
 * hooks dep-arrays); no closure over component state.
 */
const ATOMIC_FOLD: Readonly<Record<string, string>> = {
  ß: "ss",
  ı: "i",
  Ł: "L",
  ł: "l",
  Ø: "O",
  ø: "o",
  Æ: "AE",
  æ: "ae",
  Đ: "D",
  đ: "d",
};
function foldText(s: string): string {
  let pre = "";
  for (const ch of s) pre += ATOMIC_FOLD[ch] ?? ch;
  return pre.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

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
        // Soft limit so pathological campaigns (thousands of NPCs/quests)
        // don't bloat the editor's memory or the autocomplete payload.
        // RLS on each table still gates visibility for non-owners; we add
        // an explicit `is_visible_to_players` filter here as defense-in-
        // depth so a player opening the popover cannot learn about NPCs
        // or locations the DM hid from them (quest visibility is gated
        // via mig 086). Campaign owners see everything because RLS's
        // owner-bypass runs before the filter logically (we include rows
        // where visible OR owner).
        const PREVIEW_LIMIT = 1000;
        const { data: userData } = await supabase.auth.getUser();
        const currentUserId = userData.user?.id ?? null;

        // Build filters differently depending on whether the caller is the
        // campaign owner. Owners see everything; non-owners only see
        // player-visible rows. We fetch the campaign owner_id up-front.
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("owner_id")
          .eq("id", campaignId)
          .single();
        const isOwner =
          !!currentUserId && campaign?.owner_id === currentUserId;

        const npcQuery = supabase
          .from("campaign_npcs")
          .select("id, name")
          .eq("campaign_id", campaignId)
          .limit(PREVIEW_LIMIT);
        const locationQuery = supabase
          .from("campaign_locations")
          .select("id, name, location_type")
          .eq("campaign_id", campaignId)
          .limit(PREVIEW_LIMIT);
        const factionQuery = supabase
          .from("campaign_factions")
          .select("id, name, alignment")
          .eq("campaign_id", campaignId)
          .limit(PREVIEW_LIMIT);
        const questQuery = supabase
          .from("campaign_quests")
          .select("id, title, status")
          .eq("campaign_id", campaignId)
          .limit(PREVIEW_LIMIT);

        if (!isOwner) {
          npcQuery.eq("is_visible_to_players", true);
          // Locations use `is_discovered` (mig 081) rather than
          // is_visible_to_players — semantics "players know about this".
          locationQuery.eq("is_discovered", true);
          factionQuery.eq("is_visible_to_players", true);
          questQuery.eq("is_visible_to_players", true);
        }

        const [npcsRes, locationsRes, factionsRes, questsRes] = await Promise.all([
          npcQuery,
          locationQuery,
          factionQuery,
          questQuery,
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
        needle: foldText(e.name),
      })),
    [entities],
  );

  const search = useCallback(
    (query: string): SearchableEntity[] => {
      const q = foldText(query.trim());
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
