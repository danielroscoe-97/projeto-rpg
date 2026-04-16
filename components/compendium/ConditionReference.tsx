"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSrdStore } from "@/lib/stores/srd-store";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { ConditionCard, REFERENCE_BORDER_COLORS } from "@/components/oracle/ConditionCard";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { useLocalePreference } from "@/lib/hooks/useLocalePreference";

const CATEGORY_BORDER: Record<string, string> = {
  condition: "border-l-gray-500",
  disease: "border-l-green-700",
  status: "border-l-blue-500",
};

const CONDITION_NAMES_PT: Record<string, string> = {
  blinded: "Cego",
  charmed: "Encantado",
  deafened: "Surdo",
  exhaustion: "Exaust\u00e3o",
  frightened: "Amedrontado",
  grappled: "Agarrado",
  incapacitated: "Incapacitado",
  invisible: "Invis\u00edvel",
  paralyzed: "Paralisado",
  petrified: "Petrificado",
  poisoned: "Envenenado",
  prone: "Ca\u00eddo",
  restrained: "Contido",
  stunned: "Atordoado",
  unconscious: "Inconsciente",
};

export function ConditionReference() {
  const t = useTranslations("compendium");
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const srdConditions = useSrdStore((s) => s.conditions);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"condition" | "disease" | "status">("condition");

  // ── PT-BR translation support ──────────────────────────────────────
  const [descLang, setDescLang] = useLocalePreference("pt-BR");
  const isPt = descLang === "pt-BR";

  const conditions = useMemo(() => srdConditions.filter((c) => c.category === "condition"), [srdConditions]);
  const diseases = useMemo(() => srdConditions.filter((c) => c.category === "disease"), [srdConditions]);
  const statuses = useMemo(() => srdConditions.filter((c) => c.category === "status"), [srdConditions]);

  const tabs = [
    { key: "condition" as const, label: t("conditions_tab"), count: conditions.length },
    { key: "disease" as const, label: t("diseases_tab"), count: diseases.length },
    { key: "status" as const, label: t("statuses_tab"), count: statuses.length },
  ];

  const activeData =
    activeTab === "condition" ? conditions :
    activeTab === "disease" ? diseases : statuses;

  const filtered = nameFilter
    ? activeData.filter((c) => {
        const q = nameFilter.toLowerCase();
        const ptName = CONDITION_NAMES_PT[c.name.toLowerCase()] ?? "";
        return c.name.toLowerCase().includes(q) || ptName.toLowerCase().includes(q);
      })
    : activeData;

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setActiveTab(tab.key); setNameFilter(""); setExpanded(null); }}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? "bg-white/[0.1] text-foreground"
                : "text-muted-foreground hover:text-foreground/80"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] opacity-60">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search + Language toggle */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          placeholder={t("search_placeholder")}
          className="flex-1 h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/40 transition-colors"
        />
        <LanguageToggle locale={descLang} onToggle={setDescLang} size="md" />
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">{t("no_results")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((condition) => {
            const nameLower = condition.name.toLowerCase();
            const ptName = CONDITION_NAMES_PT[nameLower];
            const displayCondition = isPt && ptName
              ? { ...condition, name: ptName }
              : condition;
            // When displaying in PT, the name-based border lookup inside ConditionCard
            // won't match, so pass the correct border color via defaultBorder
            const borderFallback = REFERENCE_BORDER_COLORS[nameLower] ?? CATEGORY_BORDER[activeTab];

            return (
              <ConditionCard
                key={condition.id}
                condition={displayCondition}
                variant="reference"
                expanded={expanded === condition.id}
                onToggle={() => toggleExpand(condition.id)}
                onPin={() => pinCard("condition", condition.id, condition.ruleset_version || "2014")}
                defaultBorder={borderFallback}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
