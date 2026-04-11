"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useSrdStore } from "@/lib/stores/srd-store";
import { ClassIcon } from "@/components/character/ClassIcon";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import type { SrdClass } from "@/lib/types/srd-class";

type RoleFilter = "all" | SrdClass["role"];

const ROLE_STYLES: Record<SrdClass["role"], { badge: string; label: string; labelPt: string }> = {
  martial:       { badge: "bg-red-900/30 text-red-300 border-red-500/30",           label: "Martial",     labelPt: "Marcial" },
  caster:        { badge: "bg-blue-900/30 text-blue-300 border-blue-500/30",        label: "Full Caster", labelPt: "Conjurador" },
  "half-caster": { badge: "bg-purple-900/30 text-purple-300 border-purple-500/30",  label: "Half-Caster", labelPt: "Semi-Conjurador" },
  support:       { badge: "bg-green-900/30 text-green-300 border-green-500/30",     label: "Support",     labelPt: "Suporte" },
};

const ROLE_BORDER: Record<SrdClass["role"], string> = {
  martial:       "border-l-red-500/60",
  caster:        "border-l-blue-500/60",
  "half-caster": "border-l-purple-500/60",
  support:       "border-l-green-500/60",
};

export function ClassBrowser() {
  const t = useTranslations("compendium");
  const locale = useLocale();
  const isPt = locale === "pt-BR";
  const classes = useSrdStore((s) => s.classes);

  // Filters
  const [nameFilter, setNameFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Expanded class detail (inline accordion)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const filtered = useMemo(() => {
    let result = classes;

    if (nameFilter) {
      const q = nameFilter.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.name_pt.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== "all") {
      result = result.filter((c) => c.role === roleFilter);
    }

    return [...result].sort((a, b) => {
      const nameA = isPt ? a.name_pt : a.name;
      const nameB = isPt ? b.name_pt : b.name;
      return nameA.localeCompare(nameB);
    });
  }, [classes, nameFilter, roleFilter, isPt]);

  const hasActiveFilters = roleFilter !== "all";

  // ---- Filter bar ----
  const filterBar = (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          placeholder={t("search_placeholder")}
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/40 transition-colors"
        />
      </div>

      {/* Toggle filters */}
      <button
        type="button"
        onClick={() => setFiltersOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className={`w-3 h-3 transition-transform ${filtersOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        {t("filters")}
        {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-gold" />}
      </button>

      {filtersOpen && (
        <div className="space-y-2 pl-1">
          <FilterGroup label={t("class_filter_role")}>
            {(["all", "martial", "caster", "half-caster", "support"] as const).map((role) => (
              <Chip
                key={role}
                active={roleFilter === role}
                onClick={() => setRoleFilter(role)}
              >
                {role === "all"
                  ? t("filter_all")
                  : isPt
                  ? ROLE_STYLES[role].labelPt
                  : ROLE_STYLES[role].label}
              </Chip>
            ))}
          </FilterGroup>
        </div>
      )}

      <div className="text-[11px] text-muted-foreground">
        {t("showing_results", { count: filtered.length, total: classes.length })}
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {t("classes_found_aria", { count: filtered.length })}
      </div>
    </div>
  );

  if (classes.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        {t("loading")}
      </div>
    );
  }

  // ---- CARD GRID LAYOUT ----
  return (
    <div className="space-y-4">
      {filterBar}

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          {t("no_results")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((cls) => {
            const roleStyle = ROLE_STYLES[cls.role];
            const displayName = isPt ? cls.name_pt : cls.name;
            const altName = isPt ? cls.name : cls.name_pt;
            const description = isPt ? cls.description_pt : cls.description_en;
            const subclass = isPt ? cls.srd_subclass_pt : cls.srd_subclass;
            const roleLabel = isPt ? roleStyle.labelPt : roleStyle.label;
            const isExpanded = expandedId === cls.id;

            return (
              <div
                key={cls.id}
                className={`rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all overflow-hidden border-l-2 ${ROLE_BORDER[cls.role]}`}
              >
                {/* Card header — clickable to expand */}
                <button
                  type="button"
                  onClick={() => toggleExpand(cls.id)}
                  aria-expanded={isExpanded}
                  className="w-full text-left p-4"
                >
                  {/* Icon + Name row */}
                  <div className="flex items-start gap-3 mb-2">
                    <span className="shrink-0 text-gold" aria-hidden="true">
                      <ClassIcon characterClass={cls.id} size={32} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-foreground text-base leading-tight">
                          {displayName}
                        </h3>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      {isPt && (
                        <p className="text-[11px] text-muted-foreground italic">{altName}</p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {description}
                  </p>

                  {/* Stats row */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {/* Hit Die badge */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs font-mono text-gold">
                      {cls.hit_die}
                    </span>

                    {/* Role badge */}
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleStyle.badge}`}>
                      {roleLabel}
                    </span>

                    {/* Spellcasting indicator */}
                    {cls.spellcaster && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-900/30 border border-indigo-500/20 text-[10px] text-indigo-300">
                        {t("class_spellcasting")}: {cls.spellcasting_ability}
                      </span>
                    )}
                  </div>

                  {/* SRD Subclass hint */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground truncate">
                      {t("class_srd_subclass")}: <span className="text-foreground/70">{subclass}</span>
                    </span>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-white/[0.06] space-y-3">
                    {/* Primary Ability */}
                    <DetailRow
                      label={t("class_primary_ability")}
                      value={cls.primary_ability}
                    />

                    {/* Saving Throws */}
                    <DetailRow
                      label={t("class_saving_throws")}
                      value={cls.saving_throws.join(", ")}
                    />

                    {/* Armor Proficiencies */}
                    <DetailRow
                      label={t("class_armor_prof")}
                      value={cls.armor_proficiencies || "\u2014"}
                    />

                    {/* Weapon Proficiencies */}
                    <DetailRow
                      label={t("class_weapon_prof")}
                      value={cls.weapon_proficiencies || "\u2014"}
                    />

                    {/* Link to public class detail page */}
                    <div className="pt-1">
                      <Link
                        href={isPt ? `/classes-pt/${cls.id}` : `/classes/${cls.id}`}
                        className="text-sm text-amber-400/70 hover:text-amber-400 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("class_view_full")} →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---- Helper components ---- */

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <p className="text-sm text-foreground/80">{value}</p>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">{label}:</span>
      {children}
    </div>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-all min-h-[28px] ${
        active
          ? "bg-gold/20 text-gold border border-gold/30"
          : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08]"
      }`}
    >
      {children}
    </button>
  );
}
