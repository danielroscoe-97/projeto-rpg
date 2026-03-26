"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { getConditionsByCategory } from "@/lib/srd/srd-search";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { ConditionCard } from "@/components/oracle/ConditionCard";

const CATEGORY_BORDER: Record<string, string> = {
  condition: "border-l-gray-500",
  disease: "border-l-green-700",
  status: "border-l-blue-500",
};

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
              variant="reference"
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
