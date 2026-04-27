"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { StickyNote, BookOpen, Users, Info, Plus, Scroll, Lock } from "lucide-react";
import { ScratchPad } from "./ScratchPad";
import { QuickNotesList } from "./QuickNotesList";
import { JournalEntryCard } from "./JournalEntryCard";
import { NpcJournal } from "./NpcJournal";
import { DmNotesInbox } from "./DmNotesInbox";
import { usePlayerNotes } from "@/lib/hooks/usePlayerNotes";
import { useNpcJournal } from "@/lib/hooks/useNpcJournal";
import { isPlayerHqV2Enabled } from "@/lib/flags/player-hq-v2";

// W4/149: added `dm_inbox` sub-tab — read-only list of DM-private notes
// addressed to this character.
type NotesTab = "quick" | "journal" | "npcs" | "dm_inbox";

interface PlayerNotesSectionProps {
  characterId: string;
  campaignId: string;
}

export function PlayerNotesSection({ characterId, campaignId }: PlayerNotesSectionProps) {
  const t = useTranslations("player_hq.notes");
  const [activeTab, setActiveTab] = useState<NotesTab>("quick");
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [journalDraft, setJournalDraft] = useState({ title: "", content: "" });

  const {
    quickNotes,
    journalEntries,
    loading: notesLoading,
    addEntry,
    updateEntry,
    deleteEntry,
  } = usePlayerNotes(characterId, campaignId);

  const npcHook = useNpcJournal(characterId, campaignId);

  const loading = notesLoading || npcHook.loading;

  // B2c: when V2 flag is ON, the DM inbox is hosted by DiarioTab — drop the
  // sub-tab here to avoid double-render. V1's shell currently early-returns
  // when V2 is enabled (PlayerHqShell.tsx:232) so PlayerNotesSection itself
  // does not mount in V2 mode, but this defensive filter protects against
  // any future code path that re-uses PlayerNotesSection inside V2 surfaces.
  const hideDmInbox = isPlayerHqV2Enabled();

  const tabs: { key: NotesTab; icon: typeof StickyNote; label: string }[] = [
    { key: "quick", icon: StickyNote, label: t("tab_quick") },
    { key: "journal", icon: BookOpen, label: t("tab_journal") },
    { key: "npcs", icon: Users, label: t("tab_npcs") },
    ...(hideDmInbox
      ? []
      : ([{ key: "dm_inbox", icon: Scroll, label: t("tab_dm_inbox") }] as const)),
  ];

  const handleAddJournal = async () => {
    if (!journalDraft.content.trim()) return;
    await addEntry({
      type: "journal",
      content: journalDraft.content.trim(),
      title: journalDraft.title.trim() || undefined,
    });
    setJournalDraft({ title: "", content: "" });
    setShowJournalForm(false);
    navigator.vibrate?.([30]);
  };

  return (
    <div className="space-y-3">
      {/* Session scratch pad — always visible above sub-tabs */}
      <ScratchPad characterId={characterId} />

      {/* Privacy badge — inline text (mobile-friendly, no hover tooltip) */}
      <div className="inline-flex items-center gap-1.5 text-xs text-amber-400/70 bg-amber-400/5 border border-amber-400/15 rounded-full px-2.5 py-1">
        <Lock className="w-3 h-3" aria-hidden="true" />
        <span>{t("privacy_notice")}</span>
      </div>

      {/* Sub-tabs with ARIA tablist semantics */}
      <div className="flex border-b border-border" role="tablist" aria-label={t("notes_tablist_label")}>
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 bg-white/5 rounded" />
          <div className="h-16 bg-white/5 rounded" />
        </div>
      )}

      {/* Quick Notes */}
      {!loading && activeTab === "quick" && (
        <QuickNotesList
          notes={quickNotes}
          onAdd={(content) => addEntry({ type: "quick_note", content })}
          onUpdate={updateEntry}
          onDelete={deleteEntry}
        />
      )}

      {/* Journal */}
      {!loading && activeTab === "journal" && (
        <div className="space-y-3">
          {showJournalForm ? (
            <div className="bg-rpg-parchment rounded-lg p-3 space-y-2 border border-amber-400/10">
              <input
                type="text"
                value={journalDraft.title}
                onChange={(e) => setJournalDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder={t("journal_title_placeholder")}
                className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-border/30 pb-1"
              />
              <textarea
                autoFocus
                value={journalDraft.content}
                onChange={(e) => setJournalDraft((d) => ({ ...d, content: e.target.value }))}
                placeholder={t("journal_content_placeholder")}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[120px]"
              />
              {/* I-1: touch targets */}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowJournalForm(false); setJournalDraft({ title: "", content: "" }); }}
                  className="text-xs text-muted-foreground hover:text-foreground min-h-[44px] px-3"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleAddJournal}
                  disabled={!journalDraft.content.trim()}
                  className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-40 min-h-[44px] px-3"
                >
                  {t("save")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowJournalForm(true)}
              className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              {t("add_journal_entry")}
            </button>
          )}

          {journalEntries.length === 0 && !showJournalForm && (
            <div className="py-6 text-center">
              <BookOpen className="w-7 h-7 text-amber-400/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground/70 italic">
                {t("no_journal_entries")}
              </p>
            </div>
          )}

          {journalEntries.map((entry) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
            />
          ))}
        </div>
      )}

      {/* NPCs */}
      {!loading && activeTab === "npcs" && (
        <NpcJournal
          npcs={npcHook.npcs}
          loading={false}
          onAdd={npcHook.addNpc}
          onCycleRelationship={npcHook.cycleRelationship}
          onUpdateNotes={npcHook.updateNpcNotes}
          onDelete={npcHook.deleteNpc}
        />
      )}

      {/* W4/149: DM private notes addressed to this character (read-only).
          B2c: skip render when V2 hides the sub-tab so the host-move to
          DiarioTab is the single source of truth. */}
      {!loading && !hideDmInbox && activeTab === "dm_inbox" && (
        <DmNotesInbox characterId={characterId} />
      )}
    </div>
  );
}
