"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Star, BookOpen, Trash2 } from "lucide-react";
import type { CharacterSpell, SpellStatus } from "@/lib/types/database";

interface SpellCardProps {
  spell: CharacterSpell;
  onToggleStatus: (id: string, status: SpellStatus) => void;
  onRemove: (id: string) => Promise<void>;
}

export function SpellCard({ spell, onToggleStatus, onRemove }: SpellCardProps) {
  const t = useTranslations("player_hq.spells");
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleRemove = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 5000);
      return;
    }
    await onRemove(spell.id);
  };

  const cycleStatus = () => {
    const order: SpellStatus[] = ["known", "prepared", "favorite"];
    const idx = order.indexOf(spell.status);
    const next = order[(idx + 1) % order.length];
    onToggleStatus(spell.id, next);
    navigator.vibrate?.([30]);
  };

  return (
    <div className="group bg-white/5 rounded-lg border border-transparent hover:border-border/50 transition-colors overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-2.5">
        {/* Status badge — tap to cycle */}
        <button
          type="button"
          onClick={cycleStatus}
          className={`shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-xs transition-colors ${
            spell.status === "favorite"
              ? "bg-amber-400/20 text-amber-400"
              : spell.status === "prepared"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-white/5 text-muted-foreground"
          }`}
          aria-label={t(`status_${spell.status}`)}
          title={t(`status_${spell.status}`)}
        >
          {spell.status === "favorite" ? (
            <Star className="w-4 h-4 fill-current" />
          ) : spell.status === "prepared" ? (
            <BookOpen className="w-4 h-4" />
          ) : (
            <BookOpen className="w-4 h-4 opacity-40" />
          )}
        </button>

        {/* Name + level + tags */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left min-w-0 min-h-[44px] flex flex-col justify-center"
          aria-expanded={expanded}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground truncate">{spell.spell_name}</span>
            {spell.is_concentration && (
              // PRD decisão #45 — concentration uses --concentration token
              // (sky #7DD3FC). Replaces ad-hoc orange that collided with
              // ritual blue + low-resource amber.
              <span className="text-[9px] px-1 py-0.5 rounded bg-concentration/20 text-concentration shrink-0">C</span>
            )}
            {spell.is_ritual && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 shrink-0">R</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{spell.spell_level === 0 ? t("cantrip") : t("level_n", { n: spell.spell_level })}</span>
            {spell.school && <span>· {spell.school}</span>}
          </div>
        </button>

        {/* Expand chevron */}
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/30 pt-2 space-y-2">
          {spell.description_short && (
            <p className="text-xs text-muted-foreground">{spell.description_short}</p>
          )}

          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {spell.casting_time && (
              <div>
                <span className="text-muted-foreground">{t("casting_time")}: </span>
                <span className="text-foreground">{spell.casting_time}</span>
              </div>
            )}
            {spell.range_text && (
              <div>
                <span className="text-muted-foreground">{t("range")}: </span>
                <span className="text-foreground">{spell.range_text}</span>
              </div>
            )}
            {spell.components && (
              <div>
                <span className="text-muted-foreground">{t("components_label")}: </span>
                <span className="text-foreground">{spell.components}</span>
              </div>
            )}
            {spell.duration && (
              <div>
                <span className="text-muted-foreground">{t("duration")}: </span>
                <span className="text-foreground">{spell.duration}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={handleRemove}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors ${
                confirming
                  ? "text-red-400 animate-pulse"
                  : "text-muted-foreground hover:text-red-400"
              }`}
              aria-label={confirming ? t("confirm_remove") : t("remove_spell")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
