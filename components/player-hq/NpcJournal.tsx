"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";
import { NpcCard } from "./NpcCard";
import type { NpcNote, NpcRelationship } from "@/lib/types/database";

interface NpcJournalProps {
  npcs: NpcNote[];
  loading: boolean;
  onAdd: (input: { npc_name: string; relationship?: NpcRelationship; notes?: string }) => Promise<unknown>;
  onCycleRelationship: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function NpcJournal({
  npcs,
  loading,
  onAdd,
  onCycleRelationship,
  onUpdateNotes,
  onDelete,
}: NpcJournalProps) {
  const t = useTranslations("player_hq.notes");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const filtered = search.trim()
    ? npcs.filter((n) => n.npc_name.toLowerCase().includes(search.toLowerCase()))
    : npcs;

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await onAdd({ npc_name: trimmed });
    setNewName("");
    setAdding(false);
    navigator.vibrate?.([30]);
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 bg-white/5 rounded" />
        <div className="h-16 bg-white/5 rounded" />
        <div className="h-16 bg-white/5 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search + Add */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search_npcs")}
            className="w-full bg-white/5 border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-400/50"
          />
        </div>
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className="shrink-0 flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300 transition-colors min-h-[44px] min-w-[44px] justify-center"
          aria-label={t("add")}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value.slice(0, 100))}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setAdding(false); setNewName(""); }
            }}
            placeholder={t("npc_name_placeholder")}
            className="flex-1 bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-400/50"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="text-sm text-amber-400 hover:text-amber-300 disabled:opacity-40 px-2"
          >
            {t("add")}
          </button>
        </div>
      )}

      {/* Empty state */}
      {npcs.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t("no_npcs")}
        </p>
      )}

      {/* NPC list */}
      {filtered.map((npc) => (
        <NpcCard
          key={npc.id}
          npc={npc}
          onCycleRelationship={onCycleRelationship}
          onUpdateNotes={onUpdateNotes}
          onDelete={onDelete}
        />
      ))}

      {search && filtered.length === 0 && npcs.length > 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t("no_search_results")}
        </p>
      )}
    </div>
  );
}
