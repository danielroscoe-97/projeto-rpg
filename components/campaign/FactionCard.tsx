"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Flag,
  ChevronDown,
  ChevronUp,
  MapPin,
  Users,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CampaignFaction, FactionAlignment } from "@/lib/types/mind-map";

interface EntityRefItem {
  id: string;
  name: string;
}

interface RelatedNote {
  id: string;
  title: string;
}

const ALIGNMENT_LEFT_BORDER: Record<FactionAlignment, string> = {
  ally: "border-l-4 border-l-emerald-400",
  neutral: "border-l-4 border-l-zinc-400",
  hostile: "border-l-4 border-l-red-400",
};

const ALIGNMENT_DOT: Record<FactionAlignment, string> = {
  ally: "bg-emerald-400",
  neutral: "bg-zinc-400",
  hostile: "bg-red-400",
};

const ALIGNMENT_BADGE: Record<FactionAlignment, string> = {
  ally: "bg-emerald-900/30 text-emerald-400 border border-emerald-500/20",
  neutral: "bg-zinc-800/30 text-zinc-400 border border-zinc-500/20",
  hostile: "bg-red-900/30 text-red-400 border border-red-500/20",
};

interface FactionCardProps {
  faction: CampaignFaction;
  isEditable: boolean;
  /** Headquarters location (headquarters_of edge target). Fase 3d. */
  sede?: EntityRefItem | null;
  /** Member NPCs (member_of edge sources). Fase 3d. */
  members?: EntityRefItem[];
  /** Notes that `mentions` this faction (Fase 3e). */
  relatedNotes?: RelatedNote[];
  onEdit: (faction: CampaignFaction) => void;
  onDelete: (faction: CampaignFaction) => void;
  onToggleVisibility: (faction: CampaignFaction) => void;
  /** Called when the card body (outside action buttons) is clicked. */
  onCardClick?: (faction: CampaignFaction) => void;
}

export function FactionCard({
  faction,
  isEditable,
  sede,
  members,
  relatedNotes,
  onEdit,
  onDelete,
  onToggleVisibility,
  onCardClick,
}: FactionCardProps) {
  const t = useTranslations("factions");
  const tGraph = useTranslations("entity_graph");
  const [expanded, setExpanded] = useState(false);

  const memberCount = members?.length ?? 0;
  const notesCount = relatedNotes?.length ?? 0;
  const hasRelations = !!sede || memberCount > 0 || notesCount > 0;
  const hasExpandableContent = !!faction.description || hasRelations;

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only trigger when the click target is the wrapper itself; clicks on
    // nested buttons (which call stopPropagation) never reach here, but this
    // guards against bubble-through from non-button children.
    if (e.target !== e.currentTarget && (e.target as HTMLElement).closest("button")) return;
    onCardClick?.(faction);
  };
  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onCardClick) return;
    // Ignore keydown bubbling up from nested interactive elements — otherwise
    // pressing Enter on the expand button would also open the view dialog.
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCardClick(faction);
    }
  };
  const stop = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`group relative bg-card border border-white/[0.04] rounded-xl overflow-hidden transition-all duration-300 hover:border-amber-400/30 hover:shadow-[0_0_20px_-8px_rgba(251,191,36,0.15)] ${ALIGNMENT_LEFT_BORDER[faction.alignment]} ${
        onCardClick ? "cursor-pointer focus-within:ring-2 focus-within:ring-amber-400/40" : ""
      }`}
      data-testid={`faction-card-${faction.id}`}
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onClick={onCardClick ? handleCardClick : undefined}
      onKeyDown={onCardClick ? handleCardKeyDown : undefined}
      aria-label={onCardClick ? faction.name : undefined}
    >
      {/* Subtle top accent line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Avatar / Image area */}
          <div className="shrink-0 relative">
            {faction.image_url ? (
              <img
                src={faction.image_url}
                alt={faction.name}
                className="w-12 h-12 rounded-lg object-cover ring-2 ring-amber-400/30 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400/15 to-amber-600/10 ring-2 ring-amber-400/25 flex items-center justify-center shadow-inner">
                <Flag className="w-5 h-5 text-amber-400/70" />
              </div>
            )}
            {/* Visibility dot */}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                faction.is_visible_to_players ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />
          </div>

          {/* Name + alignment */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${ALIGNMENT_DOT[faction.alignment]}`}
              />
              <h3 className="text-sm font-semibold text-foreground line-clamp-2 break-words leading-tight">
                {faction.name}
              </h3>
            </div>

            {/* Alignment badge + relation counters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${ALIGNMENT_BADGE[faction.alignment]}`}
              >
                <Flag className="w-3 h-3" />
                {t(`alignment_${faction.alignment}`)}
              </span>
              {memberCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  data-testid={`faction-member-count-${faction.id}`}
                  title={t("membros_label")}
                >
                  <Users className="w-3 h-3" />
                  {t("membros_count", { count: memberCount })}
                </span>
              )}
              {sede && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  data-testid={`faction-sede-chip-${faction.id}`}
                  title={t("sede_label")}
                >
                  <MapPin className="w-3 h-3" />
                  {sede.name}
                </span>
              )}
            </div>
          </div>

          {/* Actions — only if editable */}
          {isEditable && (
            <div
              className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200"
              onClick={stop}
              onKeyDown={stop}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-amber-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility(faction);
                }}
                title={
                  faction.is_visible_to_players
                    ? t("visible_to_players")
                    : t("hidden_from_players")
                }
                data-testid={`faction-visibility-${faction.id}`}
              >
                {faction.is_visible_to_players ? (
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
                  onEdit(faction);
                }}
                title={t("form_title_edit")}
                data-testid={`faction-edit-${faction.id}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(faction);
                }}
                title={t("delete_title")}
                data-testid={`faction-delete-${faction.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Expand/collapse toggle */}
        {hasExpandableContent && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
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
                ? t("description_label")
                : faction.description.slice(0, 50) +
                  (faction.description.length > 50 ? "..." : "")}
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </button>
        )}

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            {faction.description && (
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {faction.description}
              </p>
            )}
            {memberCount > 0 && (
              <div data-testid={`faction-members-${faction.id}`}>
                <p className="text-[11px] font-medium text-muted-foreground/60 mb-1.5">
                  {t("membros_label")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {members!.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-amber-500/5 text-amber-300 border border-amber-500/15"
                    >
                      <Users className="w-3 h-3" />
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {notesCount > 0 && (
              <div data-testid={`faction-related-notes-${faction.id}`}>
                <p className="text-[11px] font-medium text-muted-foreground/60 mb-1.5">
                  {tGraph("notes_about_this")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {relatedNotes!.map((n) => (
                    <span
                      key={n.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-500/10 text-slate-300 border border-slate-500/20"
                    >
                      <FileText className="w-3 h-3" />
                      {n.title || n.id.slice(0, 6)}
                    </span>
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
