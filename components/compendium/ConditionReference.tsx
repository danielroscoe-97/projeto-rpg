"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { getConditionsByCategory } from "@/lib/srd/srd-search";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import type { SrdCondition } from "@/lib/srd/srd-loader";

/** Maps condition names to their badge accent color (left border). */
const CONDITION_COLORS: Record<string, string> = {
  Blinded: "border-l-gray-500",
  Charmed: "border-l-pink-500",
  Deafened: "border-l-gray-400",
  Exhaustion: "border-l-yellow-600",
  Frightened: "border-l-purple-500",
  Grappled: "border-l-orange-500",
  Incapacitated: "border-l-red-600",
  Invisible: "border-l-blue-300",
  Paralyzed: "border-l-red-800",
  Petrified: "border-l-stone-500",
  Poisoned: "border-l-green-500",
  Prone: "border-l-amber-700",
  Restrained: "border-l-teal-500",
  Stunned: "border-l-gold",
  Unconscious: "border-l-gray-800",
};

const CATEGORY_BORDER: Record<string, string> = {
  condition: "border-l-gray-500",
  disease: "border-l-green-700",
  status: "border-l-blue-500",
};

function ConditionCard({
  condition,
  expanded,
  onToggle,
  onPin,
  defaultBorder,
}: {
  condition: SrdCondition;
  expanded: boolean;
  onToggle: () => void;
  onPin: () => void;
  defaultBorder: string;
}) {
  const borderColor = CONDITION_COLORS[condition.name] ?? defaultBorder;
  const preview = condition.description.split("\n")[0].slice(0, 100);

  return (
    <div
      className={`rounded-lg border border-white/[0.06] border-l-2 ${borderColor} hover:border-white/[0.12] transition-colors`}
    >
      <div className="flex items-start gap-1 px-4 py-3 min-h-[52px]">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 text-left min-w-0"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground">{condition.name}</span>
            {condition.source && (
              <span className="text-[10px] text-muted-foreground/50 font-mono">{condition.source}</span>
            )}
          </div>
          {!expanded && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preview}…</p>
          )}
        </button>
        <button
          type="button"
          onClick={onPin}
          className="px-2 py-0.5 text-[10px] rounded font-medium bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[28px] shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8.5 1.5a.5.5 0 0 0-1 0v4.396L4.12 7.673a.5.5 0 0 0-.27.444v1.266a.5.5 0 0 0 .63.484L7.5 9.18V13l-1.354 1.354a.5.5 0 0 0 .354.854h3a.5.5 0 0 0 .354-.854L8.5 13V9.18l3.02.687a.5.5 0 0 0 .63-.484V8.117a.5.5 0 0 0-.27-.444L8.5 5.896V1.5z"/></svg>
        </button>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-3">
          <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
            {condition.description}
          </div>
        </div>
      )}
    </div>
  );
}

export function ConditionReference() {
  const t = useTranslations("compendium");
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"condition" | "disease" | "status">("condition");

  const conditions = getConditionsByCategory("condition");
  const diseases = getConditionsByCategory("disease");
  const statuses = getConditionsByCategory("status");

  const tabs = [
    { key: "condition" as const, label: t("conditions_tab"), count: conditions.length },
    { key: "disease" as const, label: t("diseases_tab"), count: diseases.length },
    { key: "status" as const, label: t("statuses_tab"), count: statuses.length },
  ];

  const activeData =
    activeTab === "condition" ? conditions :
    activeTab === "disease" ? diseases : statuses;

  const filtered = nameFilter
    ? activeData.filter((c) => c.name.toLowerCase().includes(nameFilter.toLowerCase()))
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

      {/* Search */}
      <input
        type="text"
        value={nameFilter}
        onChange={(e) => setNameFilter(e.target.value)}
        placeholder={t("search_placeholder")}
        className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold/40 transition-colors"
      />

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">{t("no_results")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((condition) => (
            <ConditionCard
              key={condition.id}
              condition={condition}
              expanded={expanded === condition.id}
              onToggle={() => toggleExpand(condition.id)}
              onPin={() => pinCard("condition", condition.id, condition.ruleset_version || "2014")}
              defaultBorder={CATEGORY_BORDER[activeTab]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
