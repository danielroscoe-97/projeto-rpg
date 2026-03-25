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
        <h3 className="text-foreground text-sm font-medium">Conditions</h3>
        <span
          className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-white/[0.06] text-muted-foreground"
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
                className="w-full flex items-center gap-2 px-3 py-2 text-left bg-card border border-border rounded-md hover:text-gold transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[44px]"
                aria-label={`View ${condition.name} rules`}
                data-testid={`condition-row-${condition.id}`}
              >
                <span className="text-foreground text-sm font-medium flex-1">
                  {condition.name}
                </span>
                <span className="text-muted-foreground/60 text-xs">View rules</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm" data-testid="condition-lookup-empty">
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
