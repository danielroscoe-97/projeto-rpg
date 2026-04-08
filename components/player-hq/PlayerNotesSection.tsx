"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { StickyNote, BookOpen, Users, Lock, Plus } from "lucide-react";
import { ScratchPad } from "./ScratchPad";
import { QuickNotesList } from "./QuickNotesList";
import { JournalEntryCard } from "./JournalEntryCard";
import { NpcJournal } from "./NpcJournal";
import { usePlayerNotes } from "@/lib/hooks/usePlayerNotes";
import { useNpcJournal } from "@/lib/hooks/useNpcJournal";

type NotesTab = "quick" | "journal" | "npcs";

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

  const tabs: { key: NotesTab; icon: typeof StickyNote; label: string }[] = [
    { key: "quick", icon: StickyNote, label: t("tab_quick") },
    { key: "journal", icon: BookOpen, label: t("tab_journal") },
    { key: "npcs", icon: Users, label: t("tab_npcs") },
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

      {/* Privacy badge */}
      <div className="inline-flex items-center gap-1.5 text-xs text-amber-400/70 bg-amber-400/5 border border-amber-400/15 rounded-full px-2.5 py-1">
        <Lock className="w-3 h-3" />
        <span>{t("privacy_notice")}</span>
      </div>

      {/* I-5: Sub-tabs with ARIA tablist semantics — underline style matching main tab bar */}
      <div className="flex border-b border-border" role="tablist" aria-label={t("tab_quick")}>
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
            <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-border/50">
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
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("no_journal_entries")}
            </p>
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
    </div>
  );
}
