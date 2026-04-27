"use client";

import { useTranslations } from "next-intl";

/**
 * HeroiTab — stub placeholder for Sprint 3 Track A (Story B1).
 *
 * Track B fills this with the composition of:
 *   CharacterStatusPanel + CharacterCoreStats + ProficienciesSection +
 *   ActiveEffectsPanel + SpellSlotsHq + ResourceTrackerList + SpellListSection
 * per [09-implementation-plan.md §B2](../../../_bmad-output/party-mode-2026-04-22/09-implementation-plan.md).
 */

export interface PlayerHqV2TabProps {
  characterId: string;
  campaignId: string;
  userId: string;
}

export function HeroiTab(_props: PlayerHqV2TabProps) {
  const t = useTranslations("player_hq");
  return (
    <div
      data-testid="tab-stub-heroi"
      className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground"
    >
      {t("tabs.heroi")}
    </div>
  );
}
