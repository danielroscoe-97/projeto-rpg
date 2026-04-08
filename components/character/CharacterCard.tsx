"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  User,
  Upload,
  Trash2,
  Heart,
  Shield,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Swords,
} from "lucide-react";
import { ClassBadge } from "@/components/character/ClassBadge";
import { ClassIcon } from "@/components/character/ClassIcon";
import { Button } from "@/components/ui/button";
import type { PlayerCharacter } from "@/lib/types/database";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";

interface CharacterCardProps {
  character: PlayerCharacter;
  onClick?: () => void;
  onUploadToken?: () => void;
  onDelete?: () => void;
  /** Linked account member info */
  member?: CampaignMemberWithUser | null;
  /** DM notes integration */
  dmNotes?: string;
  onDmNotesChange?: (value: string) => void;
  notesSaveStatus?: "idle" | "saving" | "saved" | "error";
}

export function CharacterCard({
  character,
  onClick,
  onUploadToken,
  onDelete,
  member,
  dmNotes,
  onDmNotesChange,
  notesSaveStatus,
}: CharacterCardProps) {
  const t = useTranslations("character");
  const [expanded, setExpanded] = useState(false);

  const subtitle = [character.race, character.class].filter(Boolean).join(" ");
  const levelStr = character.level ? `${t("level_abbr")} ${character.level}` : null;
  const hasNotes = dmNotes != null && onDmNotesChange != null;
  const hasExpandableContent = hasNotes || character.notes || character.background;

  return (
    <div
      data-testid={`character-card-${character.id}`}
      className={`group relative bg-card border border-white/[0.04] rounded-xl overflow-hidden transition-all duration-300 hover:border-amber-400/30 hover:shadow-[0_0_20px_-8px_rgba(251,191,36,0.15)] ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Subtle top accent line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Token avatar */}
          <div className="shrink-0 relative">
            {character.token_url ? (
              <img
                src={character.token_url}
                alt={character.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-400/30 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400/15 to-amber-600/10 ring-2 ring-amber-400/25 flex items-center justify-center shadow-inner">
                <ClassIcon characterClass={character.class} size={20} className="text-amber-400/60" />
              </div>
            )}
            {/* Linked account dot or class badge */}
            {member ? (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card bg-emerald-400" />
            ) : (
              <ClassBadge characterClass={character.class} size="sm" className="absolute -bottom-0.5 -right-0.5" />
            )}
          </div>

          {/* Name + subtitle */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground line-clamp-1 break-words leading-tight">
              {character.name}
            </h3>
            {(subtitle || levelStr) && (
              <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                {[subtitle, levelStr].filter(Boolean).join(" \u00b7 ")}
              </p>
            )}

            {/* Stat badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {character.max_hp > 0 && (
                <span
                  data-testid="card-stat-hp"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20"
                >
                  <Heart className="w-3 h-3" />
                  {character.current_hp}/{character.max_hp}
                </span>
              )}
              {character.ac > 0 && (
                <span
                  data-testid="card-stat-ac"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
                >
                  <Shield className="w-3 h-3" />
                  {character.ac}
                </span>
              )}
              {character.level != null && character.level > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" />
                  {t("level_abbr")} {character.level}
                </span>
              )}
              {character.initiative_bonus != null && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Swords className="w-3 h-3" />
                  {character.initiative_bonus >= 0 ? "+" : ""}{character.initiative_bonus}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0 opacity-60 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
            {onUploadToken && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-amber-400"
                onClick={(e) => { e.stopPropagation(); onUploadToken(); }}
                title={t("upload_token")}
              >
                <Upload className="w-3.5 h-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-400"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title={t("delete_confirm")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Linked account badge */}
        {member && (
          <div className="flex items-center gap-2 mt-2.5 px-2.5 py-1.5 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
            <User className="w-3 h-3 text-emerald-400/60 shrink-0" />
            <span className="text-[11px] text-muted-foreground truncate flex-1">
              {member.display_name ?? member.email?.split("@")[0] ?? "Jogador"}
            </span>
            <span className="text-[10px] text-emerald-400/80 whitespace-nowrap">
              {t("linked_account")}
            </span>
          </div>
        )}

        {/* Expand/collapse toggle */}
        {hasExpandableContent && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors w-full"
          >
            <div className="flex-1 h-px bg-border/50" />
            {expanded ? (
              <ChevronUp className="w-3 h-3 shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 shrink-0" />
            )}
            <span className="shrink-0">
              {expanded ? t("notes") : hasNotes ? t("notes") : t("info")}
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </button>
        )}

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Character background/notes */}
            {(character.background || character.notes) && (
              <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                {character.background && (
                  <p>
                    <span className="text-muted-foreground/50">{t("background_label")}:</span>{" "}
                    {character.background}
                  </p>
                )}
                {character.notes && (
                  <p className="whitespace-pre-wrap">{character.notes}</p>
                )}
              </div>
            )}

            {/* DM Notes - integrated */}
            {hasNotes && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium text-amber-400/70">{t("dm_notes_label")}</p>
                  <div className="h-4">
                    {notesSaveStatus === "saving" && (
                      <span className="text-[10px] text-muted-foreground animate-pulse">
                        {t("saving")}
                      </span>
                    )}
                    {notesSaveStatus === "saved" && (
                      <span className="text-[10px] text-emerald-400">{t("saved")}</span>
                    )}
                    {notesSaveStatus === "error" && (
                      <span className="text-[10px] text-red-400">{t("save_error")}</span>
                    )}
                  </div>
                </div>
                <textarea
                  value={dmNotes}
                  onChange={(e) => onDmNotesChange!(e.target.value)}
                  placeholder={t("dm_notes_placeholder")}
                  maxLength={2000}
                  rows={2}
                  className="w-full bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2 text-xs text-muted-foreground placeholder:text-muted-foreground/30 resize-y focus:outline-none focus:border-amber-500/25 transition-colors"
                  style={{ minHeight: "3rem", maxHeight: "8rem" }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
