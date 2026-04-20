"use client";

/**
 * LocationParentSelect — dropdown to pick a parent location for a given
 * location. Filters out the location itself and all its descendants to
 * prevent cycles client-side before the DB trigger (mig 146) fires.
 *
 * See docs/SPEC-entity-graph-implementation.md §2 Fase 3b.
 * See docs/PRD-entity-graph.md §6.1, §7.1.
 */

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { CampaignLocation } from "@/lib/types/mind-map";

export const NONE_PARENT_VALUE = "__none__" as const;

interface LocationParentSelectProps {
  /** Full flat list of locations in the current campaign. */
  availableLocations: CampaignLocation[];
  /** Current selected parent id (null = root). */
  value: string | null;
  onChange: (parentId: string | null) => void;
  /**
   * Location being edited, if any. Used to filter out self + descendants.
   * Omit when creating a new location (nothing to filter).
   */
  editingLocationId?: string | null;
  disabled?: boolean;
  /** When true, renders without the Label wrapper (for inline uses). */
  noLabel?: boolean;
}

/**
 * Build the set of ids that must be excluded from the parent dropdown:
 * the editing location itself plus every descendant (transitive).
 */
function collectDescendantIds(
  locations: CampaignLocation[],
  rootId: string,
): Set<string> {
  const byParent = new Map<string, CampaignLocation[]>();
  for (const loc of locations) {
    if (loc.parent_location_id) {
      const bucket = byParent.get(loc.parent_location_id) ?? [];
      bucket.push(loc);
      byParent.set(loc.parent_location_id, bucket);
    }
  }

  const excluded = new Set<string>([rootId]);
  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = byParent.get(current) ?? [];
    for (const child of children) {
      if (!excluded.has(child.id)) {
        excluded.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return excluded;
}

/**
 * Sort locations into a flat list ordered as a depth-first walk of the tree,
 * so the dropdown preserves intuitive hierarchy visually via indentation.
 */
function flattenTree(
  locations: CampaignLocation[],
): Array<{ location: CampaignLocation; depth: number }> {
  const byParent = new Map<string | null, CampaignLocation[]>();
  for (const loc of locations) {
    const key = loc.parent_location_id ?? null;
    const bucket = byParent.get(key) ?? [];
    bucket.push(loc);
    byParent.set(key, bucket);
  }
  for (const bucket of byParent.values()) {
    bucket.sort((a, b) => a.name.localeCompare(b.name));
  }

  const result: Array<{ location: CampaignLocation; depth: number }> = [];
  const walk = (parentId: string | null, depth: number) => {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      result.push({ location: child, depth });
      walk(child.id, depth + 1);
    }
  };
  walk(null, 0);
  return result;
}

export function LocationParentSelect({
  availableLocations,
  value,
  onChange,
  editingLocationId,
  disabled,
  noLabel,
}: LocationParentSelectProps) {
  const t = useTranslations("locations");

  const excludedIds = useMemo<Set<string>>(() => {
    if (!editingLocationId) return new Set();
    return collectDescendantIds(availableLocations, editingLocationId);
  }, [availableLocations, editingLocationId]);

  const options = useMemo(
    () =>
      flattenTree(availableLocations).filter(
        ({ location }) => !excludedIds.has(location.id),
      ),
    [availableLocations, excludedIds],
  );

  const handleValueChange = (next: string) => {
    onChange(next === NONE_PARENT_VALUE ? null : next);
  };

  const select = (
    <Select
      value={value ?? NONE_PARENT_VALUE}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        className="w-full"
        data-testid="location-parent-select"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_PARENT_VALUE}>{t("parent_none")}</SelectItem>
        {options.map(({ location, depth }) => (
          <SelectItem
            key={location.id}
            value={location.id}
            data-testid={`location-parent-option-${location.id}`}
          >
            <span style={{ paddingLeft: `${depth * 12}px` }}>
              {depth > 0 ? "↳ " : ""}
              {location.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (noLabel) return select;

  return (
    <div className="space-y-1.5">
      <Label htmlFor="location-parent">{t("parent_label")}</Label>
      {select}
      <p className="text-xs text-muted-foreground">{t("parent_help")}</p>
    </div>
  );
}
