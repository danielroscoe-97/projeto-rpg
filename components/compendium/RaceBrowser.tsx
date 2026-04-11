"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSrdStore } from "@/lib/stores/srd-store";
import { Search, ChevronDown, ChevronRight, Eye } from "lucide-react";
import type { SrdRace } from "@/lib/srd/srd-loader";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SIZE_LABELS: Record<string, string> = {
  T: "Tiny",
  S: "Small",
  M: "Medium",
  L: "Large",
  H: "Huge",
  G: "Gargantuan",
};

function formatSize(size: string[]): string {
  return size.map((s) => SIZE_LABELS[s] ?? s).join(", ");
}

function formatSpeed(speed: Record<string, number>): string {
  const parts = Object.entries(speed).map(([mode, ft]) => {
    const label = mode === "walk" ? "" : ` ${mode}`;
    return `${ft} ft.${label}`;
  });
  return parts.length > 0 ? parts.join(", ") : "—";
}

// Ability score pill colors matching PublicRaceDetail
const ABILITY_COLORS: Record<string, string> = {
  STR: "bg-red-900/40 text-red-300 border-red-800/50",
  DEX: "bg-green-900/40 text-green-300 border-green-800/50",
  CON: "bg-orange-900/40 text-orange-300 border-orange-800/50",
  INT: "bg-blue-900/40 text-blue-300 border-blue-800/50",
  WIS: "bg-purple-900/40 text-purple-300 border-purple-800/50",
  CHA: "bg-yellow-900/30 text-gold border-yellow-800/50",
};

function AbilityBonusPills({ bonuses }: { bonuses: string }) {
  if (!bonuses) return null;
  const parts = bonuses.split(",").map((s) => s.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((part) => {
        const stat = part.split(" ")[0];
        const color = ABILITY_COLORS[stat] ?? "bg-gray-800/50 text-gray-300 border-gray-700/50";
        return (
          <span
            key={part}
            className={`text-xs px-2 py-0.5 rounded-full border font-mono ${color}`}
          >
            {part}
          </span>
        );
      })}
    </div>
  );
}

// ── RaceRow ───────────────────────────────────────────────────────────────────

function RaceRow({ race, isExpanded, onToggle }: {
  race: SrdRace;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("compendium");

  return (
    <div className="border border-white/[0.08] rounded-lg bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors min-h-[44px]"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <span id={`race-${race.id}`} className="font-medium text-foreground text-sm">{race.name}</span>
        <span className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{formatSize(race.size)}</span>
          {race.ability_bonuses && (
            <span className="hidden sm:block text-xs text-muted-foreground">
              {race.ability_bonuses}
            </span>
          )}
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground">
            {race.source}
          </span>
        </span>
      </button>

      {isExpanded && (
        <div
          className="px-4 pb-4 pt-2 border-t border-white/[0.06] space-y-3"
          role="region"
          aria-labelledby={`race-${race.id}`}
        >
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">{t("races_size")}</p>
              <p className="text-sm font-medium text-foreground">{formatSize(race.size)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">{t("races_speed")}</p>
              <p className="text-sm font-medium text-foreground">{formatSpeed(race.speed)}</p>
            </div>
            {race.darkvision != null && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {t("races_darkvision")}
                </p>
                <p className="text-sm font-medium text-foreground">{race.darkvision} ft.</p>
              </div>
            )}
            {race.languages && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">{t("races_languages")}</p>
                <p className="text-sm font-medium text-foreground">{race.languages}</p>
              </div>
            )}
          </div>

          {/* Ability bonuses */}
          {race.ability_bonuses && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("races_ability_bonuses")}</p>
              <AbilityBonusPills bonuses={race.ability_bonuses} />
            </div>
          )}

          {/* Traits */}
          {race.traits.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">{t("races_traits")}</p>
              <div className="space-y-2">
                {race.traits.map((trait, i) => (
                  <div key={i} className="text-sm leading-relaxed">
                    <span className="font-semibold text-gold/90">{trait.name}.</span>{" "}
                    <span className="text-foreground/80">{trait.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── RaceBrowser ───────────────────────────────────────────────────────────────

type SizeFilter = "all" | "S" | "M" | "L";

export function RaceBrowser() {
  const t = useTranslations("compendium");
  const races = useSrdStore((s) => s.races);
  const [nameFilter, setNameFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = races;
    if (nameFilter) {
      const lower = nameFilter.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          (r.ability_bonuses?.toLowerCase()?.includes(lower) ?? false)
      );
    }
    if (sizeFilter !== "all") {
      result = result.filter((r) => r.size.includes(sizeFilter));
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [races, nameFilter, sizeFilter]);

  // Deduplicate by unique name for display count purposes — same race
  // can appear from multiple sources (DMG, EEPC, MPMM, etc.)
  const uniqueNames = useMemo(
    () => new Set(filtered.map((r) => r.name)).size,
    [filtered]
  );

  function toggleExpanded(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-4">
      {/* Search + filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("races_search_placeholder")}
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.06] border border-white/[0.08] rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/50"
            aria-label={t("races_search_placeholder")}
          />
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04]">
          {(["all", "S", "M", "L"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSizeFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors min-h-[44px] sm:min-h-0 ${
                sizeFilter === key
                  ? "bg-white/[0.1] text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              {t(`races_size_filter_${key}`)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("races_count", { count: filtered.length, unique: uniqueNames })}
      </p>

      {/* Race list */}
      <div className="space-y-2">
        {filtered.map((race) => (
          <RaceRow
            key={race.id}
            race={race}
            isExpanded={expanded === race.id}
            onToggle={() => toggleExpanded(race.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t("races_empty")}
          </p>
        )}
      </div>
    </div>
  );
}
