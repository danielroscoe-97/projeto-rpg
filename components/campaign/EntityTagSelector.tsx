"use client";

/**
 * EntityTagSelector — generic selector for linking one entity to other
 * entities of a given type (NPC, Location, Faction, Quest).
 *
 * Supports two modes:
 *   - Multi (default): chip list + dropdown to add more.
 *   - Single (`singleSelect`): dropdown only, "none" as first option.
 *
 * Parent owns data fetching — pass `availableItems` pre-loaded. This keeps
 * the component pure and avoids N queries for the same list across forms.
 *
 * See docs/SPEC-entity-graph-implementation.md §2 Fase 3c.
 * See docs/PRD-entity-graph.md §7.2, §7.3.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Plus, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { PrimaryEntityType } from "@/lib/types/entity-links";

export interface EntityTagItem {
  id: string;
  name: string;
}

export const NONE_VALUE = "__none__" as const;

interface EntityTagSelectorProps {
  type: PrimaryEntityType;
  availableItems: EntityTagItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  singleSelect?: boolean;
  /** Human-readable label. When omitted, no label wrapper is rendered. */
  label?: string;
  /** Help text under the control. */
  helpText?: string;
  /** Placeholder for the empty option in singleSelect mode. */
  noneLabel?: string;
  /** Test-id prefix; defaults to `entity-tag-{type}`. */
  testIdPrefix?: string;
  disabled?: boolean;
}

export function EntityTagSelector({
  type,
  availableItems,
  selectedIds,
  onChange,
  singleSelect = false,
  label,
  helpText,
  noneLabel,
  testIdPrefix,
  disabled,
}: EntityTagSelectorProps) {
  const t = useTranslations("entity_graph");
  const prefix = testIdPrefix ?? `entity-tag-${type}`;

  const sortedItems = useMemo(
    () => [...availableItems].sort((a, b) => a.name.localeCompare(b.name)),
    [availableItems],
  );

  // ---------- Single select (dropdown) -------------------------------------
  if (singleSelect) {
    const current = selectedIds[0] ?? null;
    return (
      <div className="space-y-1.5">
        {label && <Label>{label}</Label>}
        <Select
          value={current ?? NONE_VALUE}
          onValueChange={(next) => {
            onChange(next === NONE_VALUE ? [] : [next]);
          }}
          disabled={disabled}
        >
          <SelectTrigger
            className="w-full"
            data-testid={`${prefix}-select`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>
              {noneLabel ?? t("none_option")}
            </SelectItem>
            {sortedItems.map((item) => (
              <SelectItem
                key={item.id}
                value={item.id}
                data-testid={`${prefix}-option-${item.id}`}
              >
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {helpText && (
          <p className="text-xs text-muted-foreground">{helpText}</p>
        )}
      </div>
    );
  }

  // ---------- Multi (chip + add-dropdown) ----------------------------------
  return (
    <EntityTagMulti
      label={label}
      helpText={helpText}
      availableItems={sortedItems}
      selectedIds={selectedIds}
      onChange={onChange}
      testIdPrefix={prefix}
      disabled={disabled}
    />
  );
}

interface EntityTagMultiProps {
  label?: string;
  helpText?: string;
  availableItems: EntityTagItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  testIdPrefix: string;
  disabled?: boolean;
}

function EntityTagMulti({
  label,
  helpText,
  availableItems,
  selectedIds,
  onChange,
  testIdPrefix,
  disabled,
}: EntityTagMultiProps) {
  const t = useTranslations("entity_graph");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => availableItems.filter((x) => selectedIds.includes(x.id)),
    [availableItems, selectedIds],
  );
  const unselected = useMemo(
    () =>
      availableItems
        .filter((x) => !selectedIds.includes(x.id))
        .filter((x) =>
          search.length === 0
            ? true
            : x.name.toLowerCase().includes(search.toLowerCase()),
        ),
    [availableItems, selectedIds, search],
  );

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const link = (id: string) => {
    onChange([...selectedIds, id]);
    setSearch("");
  };
  const unlink = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id));
  };

  return (
    <div className="space-y-1.5">
      {label && <Label>{label}</Label>}
      <div
        className="flex flex-wrap items-center gap-1.5"
        data-testid={`${testIdPrefix}-container`}
      >
        {selected.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-1 bg-amber-400/10 text-amber-300 rounded-full px-2 py-0.5 text-xs"
            data-testid={`${testIdPrefix}-chip-${item.id}`}
          >
            {item.name}
            <button
              type="button"
              onClick={() => unlink(item.id)}
              disabled={disabled}
              className="hover:text-amber-100 transition-colors disabled:opacity-40"
              aria-label={t("remove_link", { name: item.name })}
              data-testid={`${testIdPrefix}-chip-remove-${item.id}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {!disabled && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-400 transition-colors px-1.5 py-0.5 rounded border border-dashed border-white/[0.04] hover:border-amber-400/30"
              data-testid={`${testIdPrefix}-add`}
            >
              <Plus className="w-3 h-3" />
              {t("add_link")}
            </button>

            {open && (
              <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-card border border-white/[0.04] rounded-lg shadow-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.04]">
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("search_placeholder")}
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                    data-testid={`${testIdPrefix}-search`}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {unselected.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      {t("no_matches")}
                    </p>
                  ) : (
                    unselected.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => link(item.id)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent/10 transition-colors"
                        data-testid={`${testIdPrefix}-option-${item.id}`}
                      >
                        {item.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}
