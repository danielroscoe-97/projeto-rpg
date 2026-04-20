"use client";

/**
 * useCampaignEdges — loads every edge in a campaign once, exposes a pure
 * list plus a refetch handle. Used by list screens (NpcList, LocationList,
 * FactionList) that need to render per-entity connection badges without
 * N queries.
 *
 * Selectors from `lib/types/entity-links` (e.g. `selectCounterpartyIds`)
 * operate on the returned `edges` array directly.
 *
 * See docs/SPEC-entity-graph-implementation.md §2 Fase 3c.
 */

import { useCallback, useEffect, useState } from "react";
import { listCampaignEdges } from "@/lib/supabase/entity-links";
import type { EntityLink } from "@/lib/types/entity-links";

export interface UseCampaignEdgesResult {
  edges: EntityLink[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCampaignEdges(
  campaignId: string | null | undefined,
): UseCampaignEdgesResult {
  const [edges, setEdges] = useState<EntityLink[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEdges = useCallback(async () => {
    if (!campaignId) {
      setEdges([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const data = await listCampaignEdges(campaignId);
      setEdges(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useCampaignEdges] fetch failed:", msg);
      setError(msg);
      setEdges([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void fetchEdges();
  }, [fetchEdges]);

  return { edges, loading, error, refetch: fetchEdges };
}
