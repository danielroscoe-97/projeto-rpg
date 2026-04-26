"use client";

import { useTranslations } from "next-intl";

/**
 * MapaTab — stub placeholder for Sprint 3 Track A (Story B1).
 *
 * Track B fills this with PlayerMindMap (unchanged).
 * See [09-implementation-plan.md §B2](../../../_bmad-output/party-mode-2026-04-22/09-implementation-plan.md).
 */
export function MapaTab() {
  const t = useTranslations("player_hq");
  return (
    <div
      data-testid="tab-stub-mapa"
      className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground"
    >
      {t("tabs.mapa")}
    </div>
  );
}
