"use client";

import { useTranslations } from "next-intl";

/**
 * ArsenalTab — stub placeholder for Sprint 3 Track A (Story B1).
 *
 * Track B fills this with the composition of:
 *   AbilitiesSection + AttunementSection + BagOfHolding + PersonalInventory
 * per [09-implementation-plan.md §B2](../../../_bmad-output/party-mode-2026-04-22/09-implementation-plan.md).
 */
export function ArsenalTab() {
  const t = useTranslations("player_hq");
  return (
    <div
      data-testid="tab-stub-arsenal"
      className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground"
    >
      {t("tabs.arsenal")}
    </div>
  );
}
