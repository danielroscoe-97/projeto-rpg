"use client";

import { useState } from "react";
import { getAllConditions } from "@/lib/srd/srd-search";
import { ConditionRulesModal } from "@/components/oracle/ConditionRulesModal";
import type { SrdCondition } from "@/lib/srd/srd-loader";

export function ConditionLookup() {
  const conditions = getAllConditions();
  const [selectedCondition, setSelectedCondition] =
    useState<SrdCondition | null>(null);

  return (
    <div className="space-y-3" data-testid="condition-lookup">
      <div className="flex items-center gap-2">
        <h3 className="text-white text-sm font-medium">Conditions</h3>
        <span
          className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-white/10 text-white/50"
          aria-label="Applies to all ruleset versions"
          data-testid="conditions-version-label"
        >
          All Versions
        </span>
      </div>

      {conditions.length > 0 ? (
        <ul
          className="space-y-1"
          role="list"
          aria-label="Condition rules list"
          data-testid="condition-list"
        >
          {conditions.map((condition) => (
            <li key={condition.id}>
              <button
                type="button"
                onClick={() => setSelectedCondition(condition)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left bg-[#16213e] border border-white/10 rounded-md hover:text-[#e94560] transition-colors min-h-[44px]"
                aria-label={`View ${condition.name} rules`}
                data-testid={`condition-row-${condition.id}`}
              >
                <span className="text-white text-sm font-medium flex-1">
                  {condition.name}
                </span>
                <span className="text-white/30 text-xs">View rules</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-white/40 text-sm" data-testid="condition-lookup-empty">
          No conditions loaded.
        </p>
      )}

      <ConditionRulesModal
        condition={selectedCondition}
        open={selectedCondition !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCondition(null);
        }}
      />
    </div>
  );
}
