"use client";

import { useTranslations } from "next-intl";

/**
 * DiarioTab — stub placeholder for Sprint 3 Track A (Story B1).
 *
 * Track B fills this with the composition of:
 *   PlayerNotesSection + DmNotesInbox + NpcJournal + PlayerQuestBoard
 * per [09-implementation-plan.md §B2](../../../_bmad-output/party-mode-2026-04-22/09-implementation-plan.md).
 */
export function DiarioTab() {
  const t = useTranslations("player_hq");
  return (
    <div
      data-testid="tab-stub-diario"
      className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground"
    >
      {t("tabs.diario")}
    </div>
  );
}
