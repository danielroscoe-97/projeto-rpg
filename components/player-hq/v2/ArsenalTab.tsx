"use client";

import { useTranslations } from "next-intl";
import { Package } from "lucide-react";
import { useCharacterStatus } from "@/lib/hooks/useCharacterStatus";
import { useNotifications } from "@/lib/hooks/useNotifications";

import { AbilitiesSection } from "../AbilitiesSection";
import { AttunementSection } from "../AttunementSection";
import { BagOfHolding } from "../BagOfHolding";
import { PersonalInventory } from "../PersonalInventory";
import { NotificationFeed } from "../NotificationFeed";

export interface ArsenalTabProps {
  characterId: string;
  campaignId: string;
  userId: string;
}

/**
 * ArsenalTab — Sprint 3 Track B · Story B2b.
 *
 * Composes the 4 existing Player HQ sections that make up the "o que eu
 * carrego" surface per [09-implementation-plan.md §B2](../../../_bmad-output/party-mode-2026-04-22/09-implementation-plan.md)
 * + [04-wireframe-arsenal.md](../../../_bmad-output/party-mode-2026-04-22/04-wireframe-arsenal.md):
 *
 *   1. AbilitiesSection    — class features / racial traits / feats / manual
 *   2. AttunementSection   — magic item attunement slots (3 max)
 *   3. PersonalInventory   — character's items
 *   4. BagOfHolding        — shared party inventory
 *
 * Plus the existing notification feed (V1 hosts it inside the inventory
 * tab — preserved here so player notifications are not lost during the
 * topology refactor).
 *
 * Single-column for now. Decision #29 calls for 2-col on desktop in a
 * later wave; the wrapper signature stays compatible.
 *
 * Self-contained data fetching: calls `useCharacterStatus` to source
 * character.class / character.race for AbilitiesSection, and
 * `useNotifications` for the badge feed. Two instances of these hooks
 * (one in HeroiTab, one here) are acceptable — V1 already paid this
 * cost via per-section hook calls. A future shell-level lift can dedupe.
 */
export function ArsenalTab({
  characterId,
  campaignId,
  userId,
}: ArsenalTabProps) {
  const t = useTranslations("player_hq");
  const { character, loading: charLoading } =
    useCharacterStatus(characterId);
  const { notifications } = useNotifications(userId);

  if (charLoading) {
    return (
      <div
        className="space-y-3 animate-pulse"
        data-testid="arsenal-tab-loading"
      >
        <div className="h-32 bg-white/5 rounded-xl" />
        <div className="h-40 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (!character) {
    return (
      <div
        className="text-center py-12"
        data-testid="arsenal-tab-empty"
      >
        <p className="text-muted-foreground">{t("sheet.no_character")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="arsenal-tab-content">
      {/* 1. Abilities & Features */}
      <AbilitiesSection
        characterId={characterId}
        characterClass={character.class}
        characterRace={character.race}
      />

      {/* 2. Attunement (3 slots) */}
      <AttunementSection characterId={characterId} />

      {/* 3. Personal inventory */}
      <PersonalInventory characterId={characterId} />

      {/* Divider before shared inventory (matches V1 visual) */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" aria-hidden />
          {t("personal.shared_inventory")}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* 4. Shared Bag of Holding */}
      <BagOfHolding campaignId={campaignId} userId={userId} isDm={false} />

      {/* Notifications feed — V1 also hosts this here. Preserve so the
          player keeps a unified inbox during the topology cutover; the
          eventual D5 notification badge work moves it elsewhere. */}
      {notifications.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider px-4 pt-3 pb-1">
            {t("notifications.title")}
          </h3>
          <NotificationFeed
            notifications={notifications}
            emptyMessage={t("notifications.empty")}
          />
        </div>
      )}
    </div>
  );
}
