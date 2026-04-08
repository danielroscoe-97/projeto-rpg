"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Command } from "cmdk";
import { ChevronDown, Check, Search, SearchX } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { isFullDataMode } from "@/lib/srd/srd-mode";
import { getAvailableRaces, type RaceOption } from "@/lib/data/races";

interface RaceComboboxProps {
  value: string | null;
  onChange: (raceName: string) => void;
}

/** Group label for source badges */
const SOURCE_LABELS: Record<string, string> = {
  PHB: "PHB",
  PHB24: "PHB '24",
  VGM: "VGM",
  MPMM: "MPMM",
  EEPC: "EEPC",
  GGR: "GGR",
  AI: "AI",
  TCE: "TCE",
};

export function RaceCombobox({ value, onChange }: RaceComboboxProps) {
  const t = useTranslations("character_wizard");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fullMode = isFullDataMode();
  const races = useMemo(() => getAvailableRaces(fullMode), [fullMode]);

  // Filter races by query
  const filtered = useMemo(() => {
    if (!query) return races;
    const q = query.toLowerCase();
    return races.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q),
    );
  }, [races, query]);

  // Group: SRD races first, then non-SRD grouped by source
  const srdRaces = useMemo(() => filtered.filter((r) => r.srd), [filtered]);
  const nonSrdBySource = useMemo(() => {
    const groups: Record<string, RaceOption[]> = {};
    for (const r of filtered) {
      if (r.srd) continue;
      if (!groups[r.source]) groups[r.source] = [];
      groups[r.source].push(r);
    }
    return groups;
  }, [filtered]);

  const handleSelect = useCallback(
    (raceName: string) => {
      onChange(raceName);
      setOpen(false);
      setQuery("");
    },
    [onChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={t("race_label")}
          className={`w-full flex items-center justify-between px-4 py-3 min-h-[44px] bg-background border rounded-xl text-base transition-all focus:outline-none focus:ring-2 ${
            value
              ? "border-amber-400 bg-amber-400/10 text-foreground focus:ring-amber-400/30"
              : "border-border text-muted-foreground/40 hover:border-amber-400/30 focus:ring-amber-400/30 focus:border-amber-400/50"
          }`}
        >
          <span className={value ? "text-foreground font-medium" : ""}>
            {value || t("race_placeholder")}
          </span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            } ${value ? "text-amber-400" : "text-muted-foreground"}`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 border-amber-400/20 bg-card shadow-xl shadow-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=open]:duration-150"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <Command
          shouldFilter={false}
          className="w-full"
          label={t("race_label")}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 border-b border-white/[0.08]">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder={t("race_search_placeholder")}
              className="flex-1 h-10 bg-transparent text-foreground text-sm placeholder:text-muted-foreground/50 outline-none"
            />
          </div>

          <div className="relative">
          <Command.List className="max-h-[240px] overflow-y-auto p-1">
            {/* Empty state */}
            {filtered.length === 0 && (
              <Command.Empty className="px-4 py-6 text-center">
                <SearchX className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t("race_no_results")}</p>
              </Command.Empty>
            )}

            {/* SRD Races group */}
            {srdRaces.length > 0 && (
              <Command.Group>
                <div className="px-2 py-1.5 text-[10px] font-semibold text-amber-400/60 uppercase tracking-wider">
                  SRD
                </div>
                {srdRaces.map((race) => (
                  <Command.Item
                    key={race.id}
                    value={race.name}
                    onSelect={() => handleSelect(race.name)}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-sm text-foreground hover:bg-amber-400/5 aria-selected:bg-amber-400/10 transition-colors min-h-[40px]"
                  >
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 ${
                        value === race.name
                          ? "text-amber-400 opacity-100"
                          : "opacity-0"
                      }`}
                    />
                    <span className="flex-1">{race.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Non-SRD groups (by source book) */}
            {Object.entries(nonSrdBySource).map(([source, sourceRaces]) => (
              <Command.Group key={source}>
                <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                  {SOURCE_LABELS[source] ?? source}
                </div>
                {sourceRaces.map((race) => (
                  <Command.Item
                    key={race.id}
                    value={race.name}
                    onSelect={() => handleSelect(race.name)}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-sm text-foreground hover:bg-amber-400/5 aria-selected:bg-amber-400/10 transition-colors min-h-[40px]"
                  >
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 ${
                        value === race.name
                          ? "text-amber-400 opacity-100"
                          : "opacity-0"
                      }`}
                    />
                    <span className="flex-1">{race.name}</span>
                    <span className="text-[10px] text-muted-foreground/50 font-mono px-1.5 py-0.5 rounded bg-white/[0.04]">
                      {SOURCE_LABELS[source] ?? source}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
          {/* Scroll indicator gradient at bottom */}
          <div className="absolute bottom-0 inset-x-0 h-4 pointer-events-none bg-gradient-to-t from-card to-transparent" />
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
