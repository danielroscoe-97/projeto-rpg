"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Heart,
  Package,
  BookOpen,
  Network,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import { ClassIcon } from "@/components/character/ClassIcon";
import { CharacterEditSheet } from "../CharacterEditSheet";
import { CharacterPdfExport } from "../CharacterPdfExport";
import { useCharacterStatus } from "@/lib/hooks/useCharacterStatus";
import { PlayerHqTourProvider } from "@/components/tour/PlayerHqTourProvider";
import { usePlayerNotifications } from "@/lib/hooks/usePlayerNotifications";
import { HeroiTab } from "./HeroiTab";
import { ArsenalTab } from "./ArsenalTab";
import { DiarioTab } from "./DiarioTab";
import { MapaTab } from "./MapaTab";

/**
 * V2 Player HQ Shell — 4-tab spine (Sprint 3 Track A · Story B1).
 *
 * Locked nomenclature per
 * [PRD-EPICO-CONSOLIDADO §2 decisions #28/#29/#34/#35](../../../_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md):
 *
 *   Herói · Arsenal · Diário · Mapa
 *
 * Icons (Lucide, gold #D4A853):
 *   Heart  / Package / BookOpen / Network
 *
 * This shell intentionally renders STUB content for each tab. Track B fills
 * the stubs with the real component compositions per
 * [09-implementation-plan.md §B2](../../../_bmad-output/party-mode-2026-04-22/09-implementation-plan.md).
 *
 * Flag-gated: only mounted when `isPlayerHqV2Enabled()` returns `true`. The
 * V1 shell ([PlayerHqShell.tsx](../PlayerHqShell.tsx)) remains untouched and
 * stays the default until Sprint 10 flips the flag in prod.
 */

type TabV2 = "heroi" | "arsenal" | "diario" | "mapa";

const TABS_V2: Array<{ key: TabV2; icon: LucideIcon; labelKey: string }> = [
  { key: "heroi", icon: Heart, labelKey: "tabs.heroi" },
  { key: "arsenal", icon: Package, labelKey: "tabs.arsenal" },
  { key: "diario", icon: BookOpen, labelKey: "tabs.diario" },
  { key: "mapa", icon: Network, labelKey: "tabs.mapa" },
];

function TabBarV2({
  activeTab,
  onTabChange,
  t,
  badges,
}: {
  activeTab: TabV2;
  onTabChange: (tab: TabV2) => void;
  t: ReturnType<typeof useTranslations<"player_hq">>;
  /** Per-tab unread counts (Wave 3c D5). Undefined = no badge. */
  badges?: Partial<Record<TabV2, number>>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowFade(
      el.scrollWidth > el.clientWidth &&
        el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    );
  }, []);

  useEffect(() => {
    checkOverflow();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkOverflow, { passive: true });
    window.addEventListener("resize", checkOverflow);
    return () => {
      el.removeEventListener("scroll", checkOverflow);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [checkOverflow]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex border-b border-border overflow-x-auto scrollbar-hide"
        role="tablist"
        aria-label={t("tabs.aria_tablist")}
        data-testid="player-hq-v2-tablist"
      >
        {TABS_V2.map(({ key, icon: Icon, labelKey }) => {
          const isActive = activeTab === key;
          const badgeCount = badges?.[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-v2-${key}`}
              aria-selected={isActive}
              aria-controls={`panel-v2-${key}`}
              data-tour-id={`hq-tab-${key}`}
              data-testid={`player-hq-v2-tab-${key}`}
              onClick={() => onTabChange(key)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-amber-400 text-amber-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${isActive ? "" : "text-[#D4A853]"}`}
                aria-hidden
              />
              {t(labelKey)}
              {badgeCount > 0 && (
                <span
                  className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-amber-400 text-[10px] font-semibold text-black"
                  data-testid={`player-hq-v2-tab-${key}-badge`}
                  aria-label={`${badgeCount} new`}
                >
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {showFade && (
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-background to-transparent" />
      )}
    </div>
  );
}

export interface PlayerHqShellV2Props {
  characterId: string;
  campaignId: string;
  campaignName: string;
  userId: string;
  /** Whether the HQ tour has been completed — false triggers the tour */
  playerHqTourCompleted?: boolean;
  /** Optional initial tab (set by SSR from `?tab=` query param). */
  initialTab?: TabV2;
}

export function PlayerHqShellV2({
  characterId,
  campaignId,
  campaignName,
  userId,
  playerHqTourCompleted = true,
  initialTab,
}: PlayerHqShellV2Props) {
  const t = useTranslations("player_hq");
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabV2>(initialTab ?? "heroi");

  // Wave 3c D4 cross-nav: keep `activeTab` synced with `?tab=` so links
  // emitted from sibling drawers (NpcCard → "Ver no Mapa", PlayerNpcDrawer
  // → "Ver no Diário") update the visible tab without a hard reload. The
  // shell still renders the SSR-resolved `initialTab` first paint; this
  // effect reconciles after hydration AND on every subsequent query change.
  useEffect(() => {
    const queryTab = searchParams?.get("tab");
    if (
      queryTab === "heroi" ||
      queryTab === "arsenal" ||
      queryTab === "diario" ||
      queryTab === "mapa"
    ) {
      setActiveTab((current) => (current === queryTab ? current : queryTab));
    }
  }, [searchParams]);

  const {
    character,
    loading: charLoading,
    saveField,
  } = useCharacterStatus(characterId);

  // Wave 3c D5 — listen for `note:received` / `quest:assigned` /
  // `quest:updated` and badge the Diário tab. Visiting the tab clears its
  // category counter (tab-level dismiss); per-row markAsRead is exposed via
  // the hook for downstream consumers (DmNotesInbox).
  const { badges, markAsRead } = usePlayerNotifications(
    campaignId,
    characterId,
  );

  // Auto-clear the Diário badge when the player visits the tab.
  useEffect(() => {
    if (activeTab === "diario" && badges.diario > 0) {
      markAsRead("diario");
    }
  }, [activeTab, badges.diario, markAsRead]);

  if (charLoading) {
    return (
      <div className="space-y-3 animate-pulse" data-testid="player-hq-v2-loading">
        <div className="h-8 bg-white/5 rounded w-1/3" />
        <div className="h-40 bg-white/5 rounded-xl" />
        <div className="h-32 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("sheet.no_character")}</p>
      </div>
    );
  }

  return (
    <div
      className="space-y-3 pb-20"
      data-testid="player-hq-v2-root"
      data-active-tab={activeTab}
    >
      {/* Tour reuses the same provider as V1; tour anchors stay valid via
          `data-tour-id="hq-tab-*"` which we re-emit above. */}
      <PlayerHqTourProvider shouldAutoStart={!playerHqTourCompleted} />

      {/* Header — identity row carried over from V1 (line 1 only for now;
          quick-resources row 2 is reworked by A4 PR). */}
      <div className="flex flex-col gap-1.5" data-tour-id="hq-header">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/app/campaigns/${campaignId}`}
            aria-label={t("header.back_aria")}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1 flex items-center gap-1.5">
            <ClassIcon
              characterClass={character.class}
              size={20}
              className="text-amber-400 flex-shrink-0"
            />
            <h1 className="text-lg font-semibold text-foreground truncate">
              {[
                campaignName,
                character.name,
                [character.race, character.class].filter(Boolean).join("/") ||
                  null,
                character.level
                  ? `${t("sheet.level_prefix")}${character.level}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </h1>
          </div>
          <CharacterPdfExport
            character={{
              ...character,
              proficiencies: character.proficiencies ?? {},
            }}
          />
          <CharacterEditSheet
            character={character}
            onSave={saveField}
            translations={{
              edit_character: t("edit.edit_character"),
              identity: t("edit.identity"),
              combat_stats: t("edit.combat_stats"),
              attributes: t("edit.attributes"),
              notes: t("edit.notes"),
              name: t("edit.name"),
              race: t("edit.race"),
              class: t("edit.class"),
              level: t("edit.level"),
              subclass: t("edit.subclass"),
              subrace: t("edit.subrace"),
              background: t("edit.background"),
              alignment: t("edit.alignment"),
              max_hp: t("edit.max_hp"),
              ac: t("edit.ac"),
              speed: t("edit.speed"),
              initiative_bonus: t("edit.initiative_bonus"),
              spell_save_dc: t("edit.spell_save_dc"),
              str: t("edit.str"),
              dex: t("edit.dex"),
              con: t("edit.con"),
              int: t("edit.int"),
              wis: t("edit.wis"),
              cha: t("edit.cha"),
              notes_placeholder: t("edit.notes_placeholder"),
            }}
          />
        </div>
      </div>

      <TabBarV2
        activeTab={activeTab}
        onTabChange={setActiveTab}
        t={t}
        badges={{ diario: badges.diario }}
      />

      <div
        key={activeTab}
        id={`panel-v2-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-v2-${activeTab}`}
        className="animate-in fade-in-0 duration-150"
      >
        {/* All 4 tabs receive the canonical PlayerHqV2TabProps shape.
            HeroiTab is the real wrapper from this PR (B2a); siblings
            are still stubs from #62 follow-up (they accept the full
            shape and ignore via `_` prefix). #71/#72/#73 each swap
            their stub for a real wrapper that consumes what it needs. */}
        {activeTab === "heroi" && (
          <HeroiTab
            characterId={characterId}
            campaignId={campaignId}
            userId={userId}
          />
        )}
        {activeTab === "arsenal" && (
          <ArsenalTab
            characterId={characterId}
            campaignId={campaignId}
            userId={userId}
          />
        )}
        {activeTab === "diario" && (
          <DiarioTab
            characterId={characterId}
            campaignId={campaignId}
            userId={userId}
          />
        )}
        {activeTab === "mapa" && (
          <MapaTab
            characterId={characterId}
            campaignId={campaignId}
            campaignName={campaignName}
            userId={userId}
          />
        )}
      </div>
    </div>
  );
}
