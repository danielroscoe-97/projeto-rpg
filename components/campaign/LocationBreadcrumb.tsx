"use client";

/**
 * LocationBreadcrumb — renders ancestor trail for a location.
 *
 * Pure presentational: receives the full flat list and the current location's
 * id, computes the ancestor chain via parent_location_id lookups.
 *
 * See docs/SPEC-entity-graph-implementation.md §2 Fase 3b.
 * See docs/PRD-entity-graph.md §7.1.
 */

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { CampaignLocation } from "@/lib/types/mind-map";

interface LocationBreadcrumbProps {
  availableLocations: CampaignLocation[];
  locationId: string;
  /** When true, highlights the last (current) segment. Default true. */
  highlightLast?: boolean;
  className?: string;
}

/**
 * Walks up the parent chain. Depth guarded at 20 to match the DB trigger
 * (mig 146). Returns leaf first? No — returns root-to-leaf so the UI can
 * render left-to-right naturally.
 */
function computeAncestorChain(
  locations: CampaignLocation[],
  startId: string,
): CampaignLocation[] {
  const byId = new Map(locations.map((l) => [l.id, l]));
  const chain: CampaignLocation[] = [];
  let current = byId.get(startId);
  const seen = new Set<string>();
  let depth = 0;
  while (current && depth < 20) {
    if (seen.has(current.id)) break; // cycle guard, should never hit in prod
    seen.add(current.id);
    chain.unshift(current);
    if (!current.parent_location_id) break;
    current = byId.get(current.parent_location_id);
    depth += 1;
  }
  return chain;
}

export function LocationBreadcrumb({
  availableLocations,
  locationId,
  highlightLast = true,
  className,
}: LocationBreadcrumbProps) {
  const t = useTranslations("locations");
  const separator = t("breadcrumb_separator");

  const chain = useMemo(
    () => computeAncestorChain(availableLocations, locationId),
    [availableLocations, locationId],
  );

  if (chain.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center flex-wrap text-xs text-muted-foreground ${className ?? ""}`}
      data-testid={`location-breadcrumb-${locationId}`}
    >
      {chain.map((loc, i) => {
        const isLast = i === chain.length - 1;
        return (
          <span key={loc.id} className="inline-flex items-center">
            <span
              className={
                isLast && highlightLast
                  ? "font-medium text-foreground"
                  : undefined
              }
            >
              {loc.name}
            </span>
            {!isLast && (
              <span className="mx-1 text-muted-foreground/60" aria-hidden>
                {separator}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
