"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  User,
  ChevronDown,
  ChevronUp,
  FileText,
  Heart,
  Shield,
  Swords,
  Star,
  MapPin,
  Users,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CampaignNpc } from "@/lib/types/campaign-npcs";

interface RelatedNote {
  id: string;
  title: string;
}

/** Simple {id, name} pair used by entity-graph chips. */
interface EntityRefItem {
  id: string;
  name: string;
}

interface NpcCardProps {
  npc: CampaignNpc;
  relatedNotes?: RelatedNote[];
  /** Morada (location this NPC lives in). Null/undefined hides the chip. */
  morada?: EntityRefItem | null;
  /** Factions the NPC belongs to. Empty/undefined hides the section. */
  factions?: EntityRefItem[];
  onEdit: (npc: CampaignNpc) => void;
  onDelete: (npc: CampaignNpc) => void;
  onToggleVisibility: (npc: CampaignNpc) => void;
  onNoteClick?: (noteId: string) => void;
  /** Called when the card body (outside action buttons) is clicked. */
  onCardClick?: (npc: CampaignNpc) => void;
  /** Onda 6a: when present, renders a "Ver no Mapa de Conexões" icon button. */
  onOpenInMap?: (npc: CampaignNpc) => void;
}

export function NpcCard({
  npc,
  relatedNotes,
  morada,
  factions,
  onEdit,
  onDelete,
  onToggleVisibility,
  onNoteClick,
  onCardClick,
  onOpenInMap,
}: NpcCardProps) {
  const t = useTranslations("npcs");
  const tLinks = useTranslations("links");
  const tGraph = useTranslations("entity_graph");
  const [expanded, setExpanded] = useState(false);

  const { stats } = npc;
  const hasStats = stats.hp != null || stats.ac != null || stats.cr != null || stats.initiative_mod != null;
  const hasFactions = Array.isArray(factions) && factions.length > 0;
  const hasExpandableContent = npc.description || stats.notes || (relatedNotes && relatedNotes.length > 0);

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && (e.target as HTMLElement).closest("button")) return;
    onCardClick?.(npc);
  };
  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onCardClick) return;
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCardClick(npc);
    }
  };
  const stop = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`group relative bg-card border border-white/[0.04] rounded-xl overflow-hidden transition-all duration-300 hover:border-amber-400/30 hover:shadow-[0_0_20px_-8px_rgba(251,191,36,0.15)] ${
        onCardClick ? "cursor-pointer focus-within:ring-2 focus-within:ring-amber-400/40" : ""
      }`}
      data-testid={`npc-card-${npc.id}`}
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onClick={onCardClick ? handleCardClick : undefined}
      onKeyDown={onCardClick ? handleCardKeyDown : undefined}
      aria-label={onCardClick ? npc.name : undefined}
    >
      {/* Subtle top accent line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="shrink-0 relative">
            {npc.avatar_url ? (
              <img
                src={npc.avatar_url}
                alt={npc.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-400/30 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400/15 to-amber-600/10 ring-2 ring-amber-400/25 flex items-center justify-center shadow-inner">
                <User className="w-5 h-5 text-amber-400/70" />
              </div>
            )}
            {/* Visibility dot */}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                npc.is_visible_to_players ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />
          </div>

          {/* Name + visibility badge */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 break-words leading-tight">
              {npc.name}
            </h3>

            {/* Entity-graph chips: morada + factions */}
            {(morada || hasFactions) && (
              <div
                className="flex flex-wrap gap-1.5 mt-2"
                data-testid={`npc-relations-${npc.id}`}
              >
                {morada && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    data-testid={`npc-morada-chip-${npc.id}`}
                    title={t("lives_in_chip", { name: morada.name })}
                  >
                    <MapPin className="w-3 h-3" />
                    {morada.name}
                  </span>
                )}
                {hasFactions &&
                  factions!.map((faction) => (
                    <span
                      key={faction.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20"
                      data-testid={`npc-faction-chip-${npc.id}-${faction.id}`}
                      title={t("facoes_chip", { name: faction.name })}
                    >
                      <Users className="w-3 h-3" />
                      {faction.name}
                    </span>
                  ))}
              </div>
            )}

            {/* Stat badges */}
            {hasStats && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {stats.hp != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20" data-testid="npc-stat-hp">
                    <Heart className="w-3 h-3" />
                    {stats.hp}
                  </span>
                )}
                {stats.ac != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20" data-testid="npc-stat-ac">
                    <Shield className="w-3 h-3" />
                    {stats.ac}
                  </span>
                )}
                {stats.cr != null && stats.cr !== "" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20" data-testid="npc-stat-cr">
                    <Star className="w-3 h-3" />
                    CR {stats.cr}
                  </span>
                )}
                {stats.initiative_mod != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Swords className="w-3 h-3" />
                    {stats.initiative_mod >= 0 ? "+" : ""}{stats.initiative_mod}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200"
            onClick={stop}
            onKeyDown={stop}
          >
            {onOpenInMap && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-amber-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInMap(npc);
                }}
                title={tGraph("view_in_map")}
                aria-label={tGraph("view_in_map")}
                data-testid={`npc-open-in-map-${npc.id}`}
              >
                <Network className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-amber-400"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(npc);
              }}
              title={npc.is_visible_to_players ? t("visible_to_players") : t("hidden_from_players")}
              data-testid={`npc-visibility-${npc.id}`}
            >
              {npc.is_visible_to_players ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-amber-400"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(npc);
              }}
              title={t("edit_npc")}
              data-testid={`npc-edit-${npc.id}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(npc);
              }}
              title={t("delete_npc")}
              data-testid={`npc-delete-${npc.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Expand/collapse toggle */}
        {hasExpandableContent && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            data-testid={`npc-expand-${npc.id}`}
            aria-expanded={expanded}
            className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors w-full"
          >
            <div className="flex-1 h-px bg-border/50" />
            {expanded ? (
              <ChevronUp className="w-3 h-3 shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 shrink-0" />
            )}
            <span className="shrink-0">
              {expanded
                ? t("description")
                : npc.description
                  ? npc.description.slice(0, 50) + (npc.description.length > 50 ? "..." : "")
                  : t("notes")}
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </button>
        )}

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Description */}
            {npc.description && (
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {npc.description}
              </p>
            )}

            {/* DM Notes */}
            {stats.notes && (
              <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <p className="text-[11px] font-medium text-amber-400/70 mb-1">{t("notes")}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {stats.notes}
                </p>
              </div>
            )}

            {/* Related notes */}
            {relatedNotes && relatedNotes.length > 0 && (
              <div data-testid={`npc-related-notes-${npc.id}`}>
                <p className="text-[11px] font-medium text-muted-foreground/60 mb-1.5">
                  {tLinks("related_notes")}
                </p>
                <div className="space-y-0.5">
                  {relatedNotes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNoteClick?.(note.id);
                      }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-400 transition-colors w-full text-left py-0.5"
                      data-testid={`npc-note-link-${note.id}`}
                    >
                      <FileText className="w-3 h-3 shrink-0" />
                      <span className="truncate">{note.title || t("notes")}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
