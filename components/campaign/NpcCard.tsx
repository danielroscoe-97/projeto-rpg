"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Pencil, Trash2, User, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CampaignNpc } from "@/lib/types/campaign-npcs";

interface RelatedNote {
  id: string;
  title: string;
}

interface NpcCardProps {
  npc: CampaignNpc;
  relatedNotes?: RelatedNote[];
  onEdit: (npc: CampaignNpc) => void;
  onDelete: (npc: CampaignNpc) => void;
  onToggleVisibility: (npc: CampaignNpc) => void;
  onNoteClick?: (noteId: string) => void;
}

export function NpcCard({ npc, relatedNotes, onEdit, onDelete, onToggleVisibility, onNoteClick }: NpcCardProps) {
  const t = useTranslations("npcs");
  const tLinks = useTranslations("links");
  const [expanded, setExpanded] = useState(false);

  const { stats } = npc;

  return (
    <div
      className="bg-card border border-border rounded-lg p-4 transition-all duration-200 hover:border-amber-400/30"
      data-testid={`npc-card-${npc.id}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {npc.avatar_url ? (
            <img
              src={npc.avatar_url}
              alt={npc.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-400/30"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-amber-400/10 ring-2 ring-amber-400/30 flex items-center justify-center">
              <User className="w-5 h-5 text-amber-400/60" />
            </div>
          )}
        </div>

        {/* Name + visibility badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 break-words">
              {npc.name}
            </h3>
            <button
              type="button"
              onClick={() => onToggleVisibility(npc)}
              className="shrink-0"
              title={npc.is_visible_to_players ? t("visible_to_players") : t("hidden_from_players")}
              data-testid={`npc-visibility-${npc.id}`}
            >
              {npc.is_visible_to_players ? (
                <Eye className="w-4 h-4 text-emerald-400" />
              ) : (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Stat badges */}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {stats.hp != null && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900/30 text-red-400" data-testid="npc-stat-hp">
                HP {stats.hp}
              </span>
            )}
            {stats.ac != null && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/30 text-blue-400" data-testid="npc-stat-ac">
                AC {stats.ac}
              </span>
            )}
            {stats.cr != null && stats.cr !== "" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-900/30 text-amber-400" data-testid="npc-stat-cr">
                CR {stats.cr}
              </span>
            )}
            {stats.initiative_mod != null && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-900/30 text-purple-400">
                Init {stats.initiative_mod >= 0 ? "+" : ""}{stats.initiative_mod}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(npc)}
            title={t("edit_npc")}
            data-testid={`npc-edit-${npc.id}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-400 hover:text-red-300"
            onClick={() => onDelete(npc)}
            title={t("delete_npc")}
            data-testid={`npc-delete-${npc.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Description preview / expand */}
      {npc.description && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {expanded ? t("description") : npc.description.slice(0, 60) + (npc.description.length > 60 ? "..." : "")}
          </button>
          {expanded && (
            <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
              {npc.description}
            </p>
          )}
        </div>
      )}

      {/* Notes in expanded view */}
      {expanded && stats.notes && (
        <div className="mt-2 p-2 rounded bg-surface-secondary border border-border">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
            {stats.notes}
          </p>
        </div>
      )}

      {/* Related notes */}
      {relatedNotes && relatedNotes.length > 0 && (
        <div className="mt-3 pt-2 border-t border-border" data-testid={`npc-related-notes-${npc.id}`}>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {tLinks("related_notes")}
          </p>
          <div className="space-y-0.5">
            {relatedNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => onNoteClick?.(note.id)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                data-testid={`npc-note-link-${note.id}`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{note.title || t("notes")}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
