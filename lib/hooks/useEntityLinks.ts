"use client";

/**
 * Entity Graph — generic per-entity links hook (read-only, Fase 3a).
 *
 * Loads every edge where the entity is either source OR target in the given
 * campaign. No Realtime subscription in foundation phase — callers poll via
 * `refetch()` after mutations. Realtime arrives in a later phase when the
 * Mind Map visual is wired to entity panels (PRD §7.5).
 *
 * See docs/PRD-entity-graph.md §8 Fase 3a.
 */

import { useCallback, useEffect, useState } from "react";
import { listEntityLinks } from "@/lib/supabase/entity-links";
import type { EntityLink, EntityRef } from "@/lib/types/entity-links";

export interface UseEntityLinksResult {
  edges: EntityLink[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * @param campaignId Active campaign. Required; hook stays in loading if empty.
 * @param entity Entity whose neighborhood to fetch. Pass `null` to skip fetch
 *               (useful when the entity id is not yet known — e.g. a create
 *               form that hasn't persisted yet).
 */
export function useEntityLinks(
  campaignId: string | null | undefined,
  entity: EntityRef | null | undefined,
): UseEntityLinksResult {
  const [edges, setEdges] = useState<EntityLink[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEdges = useCallback(async () => {
    if (!campaignId || !entity) {
      setEdges([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const data = await listEntityLinks(campaignId, entity);
      setEdges(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[useEntityLinks] fetch failed:", msg);
      setError(msg);
      setEdges([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId, entity?.type, entity?.id]);

  useEffect(() => {
    void fetchEdges();
  }, [fetchEdges]);

  return { edges, loading, error, refetch: fetchEdges };
}
