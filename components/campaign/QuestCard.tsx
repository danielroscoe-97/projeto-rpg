"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Crown,
  Compass,
  Target,
  Shield,
  Package,
  ScrollText,
  Crosshair,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CampaignQuest, QuestStatus, QuestType } from "@/lib/types/quest";

interface QuestCardProps {
  quest: CampaignQuest;
  isEditable: boolean;
  onEdit: (quest: CampaignQuest) => void;
  onDelete: (quest: CampaignQuest) => void;
  onToggleVisibility: (quest: CampaignQuest) => void;
  /** Called when the card body (outside action buttons) is clicked. */
  onCardClick?: (quest: CampaignQuest) => void;
}

/* ── Status left-border colors ─────────────────────────────────────────────── */

const STATUS_BORDER: Record<QuestStatus, string> = {
  available: "border-l-4 border-l-muted-foreground/50",
  active: "border-l-4 border-l-amber-400",
  completed: "border-l-4 border-l-emerald-400",
  failed: "border-l-4 border-l-red-400",
  cancelled: "border-l-4 border-l-zinc-500",
};

const STATUS_BADGE: Record<QuestStatus, string> = {
  available: "bg-zinc-800/60 text-zinc-300 border border-zinc-600/30",
  active: "bg-amber-900/30 text-amber-300 border border-amber-500/20",
  completed: "bg-emerald-900/30 text-emerald-300 border border-emerald-500/20",
  failed: "bg-red-900/30 text-red-300 border border-red-500/20",
  cancelled: "bg-zinc-800/40 text-zinc-400 border border-zinc-600/20",
};

/* ── Type badge config ─────────────────────────────────────────────────────── */

const TYPE_ICON: Record<QuestType, React.ComponentType<{ className?: string }>> = {
  main: Crown,
  side: Compass,
  bounty: Target,
  escort: Shield,
  fetch: Package,
};

const TYPE_BADGE: Record<QuestType, string> = {
  main: "bg-amber-900/30 text-amber-400 border border-amber-500/20",
  side: "bg-blue-900/30 text-blue-400 border border-blue-500/20",
  bounty: "bg-red-900/30 text-red-400 border border-red-500/20",
  escort: "bg-emerald-900/30 text-emerald-400 border border-emerald-500/20",
  fetch: "bg-purple-900/30 text-purple-400 border border-purple-500/20",
};

export function QuestCard({
  quest,
  isEditable,
  onEdit,
  onDelete,
  onToggleVisibility,
  onCardClick,
}: QuestCardProps) {
  const t = useTranslations("campaign.quests");
  const [expanded, setExpanded] = useState(false);

  const TypeIcon = TYPE_ICON[quest.quest_type] ?? Compass;
  const hasExpandableContent = quest.context || quest.objective || quest.reward;

  const handleCardClick = () => onCardClick?.(quest);
  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onCardClick) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCardClick(quest);
    }
  };
  const stop = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`group relative bg-card border border-white/[0.04] rounded-xl overflow-hidden transition-all duration-300 hover:border-amber-400/30 hover:shadow-[0_0_20px_-8px_rgba(251,191,36,0.15)] ${STATUS_BORDER[quest.status]} ${
        !quest.is_visible_to_players ? "opacity-60" : ""
      } ${onCardClick ? "cursor-pointer focus-within:ring-2 focus-within:ring-amber-400/40" : ""}`}
      data-testid={`quest-card-${quest.id}`}
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onClick={onCardClick ? handleCardClick : undefined}
      onKeyDown={onCardClick ? handleCardKeyDown : undefined}
      aria-label={onCardClick ? quest.title : undefined}
    >
      {/* Subtle top accent line on hover */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Image thumbnail or type icon */}
          <div className="shrink-0">
            {quest.image_url ? (
              <img
                src={quest.image_url}
                alt={quest.title}
                className="w-12 h-12 rounded-lg object-cover ring-2 ring-amber-400/20 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400/15 to-amber-600/10 ring-2 ring-amber-400/20 flex items-center justify-center shadow-inner">
                <TypeIcon className="w-5 h-5 text-amber-400/70" />
              </div>
            )}
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 break-words leading-tight">
              {quest.title}
            </h3>

            {/* Type + Status badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {/* Type badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${TYPE_BADGE[quest.quest_type]}`}
                data-testid="quest-type-badge"
              >
                <TypeIcon className="w-3 h-3" />
                {t(`quest_type_${quest.quest_type}`)}
              </span>

              {/* Status badge */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_BADGE[quest.status]}`}
                data-testid="quest-status-badge"
              >
                {t(`quest_status_${quest.status}`)}
              </span>
            </div>
          </div>

          {/* Actions (DM only) */}
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
                  onToggleVisibility(quest);
                }}
                title={quest.is_visible_to_players ? t("visibility_show") : t("visibility_hide")}
                data-testid={`quest-visibility-${quest.id}`}
              >
                {quest.is_visible_to_players ? (
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
                  onEdit(quest);
                }}
                title={t("quest_form_title_edit")}
                data-testid={`quest-edit-${quest.id}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(quest);
                }}
                title={t("delete_button")}
                data-testid={`quest-delete-${quest.id}`}
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
                ? t("quest_field_context")
                : quest.context
                  ? quest.context.slice(0, 50) + (quest.context.length > 50 ? "..." : "")
                  : quest.objective
                    ? quest.objective.slice(0, 50) + (quest.objective.length > 50 ? "..." : "")
                    : t("quest_field_reward")}
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </button>
        )}

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Context */}
            {quest.context && (
              <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <p className="text-[11px] font-medium text-blue-400/70 mb-1 flex items-center gap-1">
                  <ScrollText className="w-3 h-3" />
                  {t("quest_field_context")}
                </p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {quest.context}
                </p>
              </div>
            )}

            {/* Objective */}
            {quest.objective && (
              <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <p className="text-[11px] font-medium text-amber-400/70 mb-1 flex items-center gap-1">
                  <Crosshair className="w-3 h-3" />
                  {t("quest_field_objective")}
                </p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {quest.objective}
                </p>
              </div>
            )}

            {/* Reward */}
            {quest.reward && (
              <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[11px] font-medium text-emerald-400/70 mb-1 flex items-center gap-1">
                  <Gift className="w-3 h-3" />
                  {t("quest_field_reward")}
                </p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {quest.reward}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
