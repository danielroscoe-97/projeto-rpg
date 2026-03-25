"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { getAllConditions } from "@/lib/srd/srd-search";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";

/** Maps condition names to their badge accent color (left border). */
const CONDITION_COLORS: Record<string, string> = {
  Blinded: "border-l-gray-500",
  Charmed: "border-l-pink-500",
  Deafened: "border-l-gray-400",
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

export function ConditionReference() {
  const t = useTranslations("compendium");
  const conditions = getAllConditions();
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [nameFilter, setNameFilter] = useState("");

  const filtered = nameFilter
    ? conditions.filter((c) => c.name.toLowerCase().includes(nameFilter.toLowerCase()))
    : conditions;

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
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
          {filtered.map((condition) => {
            const isOpen = expanded.has(condition.id);
            const borderColor = CONDITION_COLORS[condition.name] ?? "border-l-gray-500";
            const preview = condition.description.split("\n")[0].slice(0, 100);

            return (
              <div
                key={condition.id}
                className={`rounded-lg border border-white/[0.06] border-l-2 ${borderColor} hover:border-white/[0.12] transition-colors`}
              >
                <div className="flex items-start gap-1 px-4 py-3 min-h-[52px]">
                  <button
                    type="button"
                    onClick={() => toggleExpand(condition.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <span className="font-medium text-sm text-foreground">{condition.name}</span>
                    {!isOpen && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preview}…</p>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => pinCard("condition", condition.id, "2014")}
                    className="px-2 py-0.5 text-[10px] rounded font-medium bg-gold/20 text-gold hover:bg-gold/30 transition-colors min-h-[28px] shrink-0"
                  >
                    📌
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-white/[0.06] px-4 py-3">
                    <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                      {condition.description}
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
