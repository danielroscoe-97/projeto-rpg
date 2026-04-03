"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import type { NpcNote, NpcRelationship } from "@/lib/types/database";

const RELATIONSHIP_CONFIG: Record<NpcRelationship, { icon: string; color: string }> = {
  ally: { icon: "✅", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  enemy: { icon: "❌", color: "bg-red-500/20 text-red-300 border-red-500/40" },
  neutral: { icon: "○", color: "bg-gray-500/20 text-gray-300 border-gray-500/40" },
  unknown: { icon: "?", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" },
};

interface NpcCardProps {
  npc: NpcNote;
  onCycleRelationship: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function NpcCard({ npc, onCycleRelationship, onUpdateNotes, onDelete }: NpcCardProps) {
  const t = useTranslations("player_hq.notes");
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const rel = RELATIONSHIP_CONFIG[npc.relationship];

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 5000);
      return;
    }
    await onDelete(npc.id);
  };

  return (
    // C-5: added `group` class so group-hover works
    <div className="group bg-white/5 rounded-lg border border-transparent hover:border-border/50 transition-colors overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 p-3">
        {/* Relationship badge — tap to cycle */}
        <button
          type="button"
          onClick={() => onCycleRelationship(npc.id)}
          className={`shrink-0 w-10 h-10 min-w-[44px] min-h-[44px] rounded-full border flex items-center justify-center text-sm transition-colors ${rel.color}`}
          aria-label={t(`relationship_${npc.relationship}`)}
          title={t(`relationship_${npc.relationship}`)}
        >
          {rel.icon}
        </button>

        {/* Name + preview — I-7: aria-expanded */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left min-w-0 min-h-[44px] flex flex-col justify-center"
          aria-expanded={expanded}
          aria-label={`${npc.npc_name} — ${t(`relationship_${npc.relationship}`)}`}
        >
          <p className="text-sm font-medium text-foreground truncate">{npc.npc_name}</p>
          {npc.notes && !expanded && (
            <p className="text-xs text-muted-foreground truncate">{npc.notes.slice(0, 50)}</p>
          )}
        </button>

        {/* Delete — C-5: visible on mobile, hover on desktop */}
        <button
          type="button"
          onClick={handleDelete}
          className={`shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors ${
            confirming
              ? "text-red-400 animate-pulse"
              : "text-muted-foreground hover:text-red-400 opacity-60 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
          }`}
          aria-label={confirming ? t("confirm_delete") : t("delete_npc")}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded — editable notes */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/30 pt-2">
          <textarea
            defaultValue={npc.notes ?? ""}
            placeholder={t("npc_notes_placeholder")}
            onChange={(e) => onUpdateNotes(npc.id, e.target.value)}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[80px]"
          />
        </div>
      )}
    </div>
  );
}
