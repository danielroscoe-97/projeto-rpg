"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  StickyNote,
  Users,
  Map as MapIcon,
  Scroll,
  NotebookPen,
} from "lucide-react";

import { usePlayerNotes } from "@/lib/hooks/usePlayerNotes";
import { useNpcJournal } from "@/lib/hooks/useNpcJournal";

import { QuickNotesList } from "../QuickNotesList";
import { NpcJournal } from "../NpcJournal";
import { PlayerQuestBoard } from "../PlayerQuestBoard";
import { DmNotesInbox } from "../DmNotesInbox";
import { MinhasNotas } from "./diario/MinhasNotas";
import type { PlayerHqV2TabProps } from "./HeroiTab";

type DiarioSubTab = "quick" | "minhas" | "npcs" | "quests" | "dm_inbox";

/**
 * DiarioTab — Sprint 3 Track B · Story B2c.
 *
 * Composes the existing player-narrative surfaces per
 * [09-implementation-plan.md §B2](../../../_bmad-output/party-mode-2026-04-22/09-implementation-plan.md)
 * + [05-wireframe-diario.md](../../../_bmad-output/party-mode-2026-04-22/05-wireframe-diario.md):
 *
 *   1. Rápidas       — QuickNotesList   (carried over from V1 notes tab)
 *   2. Minhas Notas  — placeholder      (D2 in Sprint 5 builds the editor)
 *   3. NPCs          — NpcJournal       (carried over from V1 notes tab)
 *   4. Quests        — PlayerQuestBoard (was its own V1 top-level tab)
 *   5. Do Mestre     — DmNotesInbox     (HOST MOVED here from inside V1's
 *                      PlayerNotesSection per [12-reuse-matrix §4.11](
 *                      ../../../_bmad-output/party-mode-2026-04-22/
 *                      12-reuse-matrix.md))
 *
 * Sub-tab navigation matches the wireframe (one section is deferred —
 * "Diário de Sessão" lands in Sprint 5+ when recap timeline is wired).
 *
 * Self-contained data fetching: calls usePlayerNotes + useNpcJournal so
 * QuickNotesList and NpcJournal can be composed without V1's
 * PlayerNotesSection wrapper. The wrapper itself is intentionally NOT
 * rendered here to avoid double-rendering DmNotesInbox.
 *
 * NOTE on double-render concern: V1's PlayerHqShell only mounts when
 * `isPlayerHqV2Enabled()` returns false (PlayerHqShell.tsx:232 early
 * return). So PlayerNotesSection cannot run while V2 is active. As a
 * belt-and-suspenders measure for future V2-conditional usage, V1's
 * PlayerNotesSection.tsx is also patched to hide its `dm_inbox`
 * sub-tab when V2 flag is on — see the companion edit in this PR.
 */
export function DiarioTab({
  characterId,
  campaignId,
  userId,
}: PlayerHqV2TabProps) {
  const t = useTranslations("player_hq.notes");
  const [activeSubTab, setActiveSubTab] = useState<DiarioSubTab>("quick");

  const {
    quickNotes,
    loading: notesLoading,
    addEntry,
    updateEntry,
    deleteEntry,
  } = usePlayerNotes(characterId, campaignId);

  const npcHook = useNpcJournal(characterId, campaignId);
  const loading = notesLoading || npcHook.loading;

  const subtabs: {
    key: DiarioSubTab;
    icon: typeof StickyNote;
    label: string;
  }[] = [
    { key: "quick", icon: StickyNote, label: t("tab_quick") },
    { key: "minhas", icon: NotebookPen, label: t("tab_minhas") },
    { key: "npcs", icon: Users, label: t("tab_npcs") },
    { key: "quests", icon: MapIcon, label: t("tab_quests") },
    { key: "dm_inbox", icon: Scroll, label: t("tab_dm_inbox") },
  ];

  return (
    <div className="space-y-3" data-testid="diario-tab-content">
      {/* Sub-nav (mirrors V1 PlayerNotesSection sub-nav styling so the
          UX feels continuous during cutover). */}
      <div
        className="flex border-b border-border overflow-x-auto scrollbar-hide"
        role="tablist"
        aria-label={t("notes_tablist_label")}
      >
        {subtabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`diario-subtab-${key}`}
            aria-selected={activeSubTab === key}
            data-testid={`diario-subtab-${key}`}
            onClick={() => setActiveSubTab(key)}
            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeSubTab === key
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div
          className="space-y-3 animate-pulse"
          data-testid="diario-tab-loading"
        >
          <div className="h-16 bg-white/5 rounded" />
          <div className="h-16 bg-white/5 rounded" />
        </div>
      )}

      {/* 1. Rápidas */}
      {!loading && activeSubTab === "quick" && (
        <QuickNotesList
          notes={quickNotes}
          onAdd={(content) =>
            addEntry({ type: "quick_note", content })
          }
          onUpdate={updateEntry}
          onDelete={deleteEntry}
        />
      )}

      {/* 2. Minhas Notas — Wave 3c D2 (markdown editor + auto-save). */}
      {!loading && activeSubTab === "minhas" && (
        <MinhasNotas campaignId={campaignId} />
      )}

      {/* 3. NPCs */}
      {!loading && activeSubTab === "npcs" && (
        <NpcJournal
          npcs={npcHook.npcs}
          loading={false}
          onAdd={npcHook.addNpc}
          onCycleRelationship={npcHook.cycleRelationship}
          onUpdateNotes={npcHook.updateNpcNotes}
          onDelete={npcHook.deleteNpc}
        />
      )}

      {/* 4. Quests — was its own V1 top-level tab; absorbed here. */}
      {!loading && activeSubTab === "quests" && (
        <PlayerQuestBoard campaignId={campaignId} userId={userId} />
      )}

      {/* 5. Do Mestre — moved here from inside V1's PlayerNotesSection. */}
      {!loading && activeSubTab === "dm_inbox" && (
        <DmNotesInbox characterId={characterId} />
      )}
    </div>
  );
}
