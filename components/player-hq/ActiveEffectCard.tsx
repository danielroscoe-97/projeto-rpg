"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Shield,
  Cookie,
  FlaskConical,
  Package,
  Sparkles,
  Minus,
  Plus,
  X,
  Zap,
} from "lucide-react";
import type { ActiveEffect, ActiveEffectUpdate } from "@/lib/types/database";

const TYPE_ICONS: Record<string, typeof Shield> = {
  spell: Shield,
  consumable: Cookie,
  potion: FlaskConical,
  item: Package,
  other: Sparkles,
};

const TYPE_COLORS: Record<string, string> = {
  spell: "text-blue-400",
  consumable: "text-green-400",
  potion: "text-rose-400",
  item: "text-purple-400",
  other: "text-muted-foreground",
};

function formatDuration(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440);
    return `${days}d`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  }
  return `${minutes}min`;
}

interface ActiveEffectCardProps {
  effect: ActiveEffect;
  onUpdate: (id: string, updates: ActiveEffectUpdate) => Promise<unknown>;
  onDismiss: (id: string) => Promise<void>;
  onDecrementQuantity: (id: string) => Promise<void>;
  onIncrementQuantity: (id: string) => Promise<void>;
  readOnly?: boolean;
}

export function ActiveEffectCard({
  effect,
  onUpdate,
  onDismiss,
  onDecrementQuantity,
  onIncrementQuantity,
  readOnly = false,
}: ActiveEffectCardProps) {
  const t = useTranslations("player_hq.active_effects");
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(effect.notes ?? "");

  const Icon = TYPE_ICONS[effect.effect_type] ?? Sparkles;
  const iconColor = TYPE_COLORS[effect.effect_type] ?? "text-muted-foreground";
  const isConsumable = effect.effect_type === "consumable";

  const handleDismiss = () => {
    if (confirmDismiss || isConsumable) {
      onDismiss(effect.id);
    } else {
      setConfirmDismiss(true);
      setTimeout(() => setConfirmDismiss(false), 3000);
    }
  };

  const handleSaveNotes = async () => {
    setEditingNotes(false);
    if (notesValue !== (effect.notes ?? "")) {
      await onUpdate(effect.id, { notes: notesValue || null });
    }
  };

  return (
    <div className="flex flex-col gap-1.5 py-2.5 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06] group">
      {/* Row 1: Icon + Name + badges + dismiss */}
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor} shrink-0`} aria-hidden="true" />

        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-sm font-medium text-foreground truncate">
            {effect.name}
          </span>

          {effect.is_concentration && (
            // PRD decisão #45 — concentration uses --concentration token
            // (sky #7DD3FC), NOT --warning (amber, reserved for low-resource
            // alerts). The /15 bg + /20 border alpha pairing matches the
            // legacy density.
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-concentration/15 text-concentration border border-concentration/20 shrink-0">
              <Zap className="w-2.5 h-2.5" />
              {t("concentration")}
            </span>
          )}

          {effect.spell_level != null && effect.spell_level > 0 && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              L{effect.spell_level}
            </span>
          )}
        </div>

        {/* Duration label */}
        {effect.duration_minutes != null ? (
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDuration(effect.duration_minutes)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/60 shrink-0 italic">
            {t("until_dispelled")}
          </span>
        )}

        {/* Dismiss button */}
        {!readOnly && (
          <button
            type="button"
            onClick={handleDismiss}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md transition-colors shrink-0 ${
              confirmDismiss
                ? "bg-red-500/20 text-red-400"
                : "text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10"
            }`}
            aria-label={t("dismiss")}
            title={confirmDismiss ? t("dismiss_confirm", { name: effect.name }) : t("dismiss")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Row 2: Consumable quantity controls OR notes */}
      {isConsumable && !readOnly ? (
        <div className="flex items-center gap-2 pl-6">
          <button
            type="button"
            onClick={() => onDecrementQuantity(effect.id)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Decrease"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-lg font-semibold text-foreground tabular-nums min-w-[2ch] text-center">
            {effect.quantity}
          </span>
          <button
            type="button"
            onClick={() => onIncrementQuantity(effect.id)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Increase"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      ) : isConsumable && readOnly ? (
        <div className="pl-6">
          <span className="text-sm text-muted-foreground">
            {t("quantity", { count: effect.quantity })}
          </span>
        </div>
      ) : null}

      {/* Notes (click to edit) */}
      {editingNotes ? (
        <div className="pl-6">
          <input
            type="text"
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            onBlur={handleSaveNotes}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveNotes(); }}
            className="w-full text-xs bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-muted-foreground focus:outline-none focus:border-amber-500/40"
            placeholder={t("notes")}
            autoFocus
          />
        </div>
      ) : effect.notes ? (
        <button
          type="button"
          onClick={() => !readOnly && setEditingNotes(true)}
          className="pl-6 text-left"
          disabled={readOnly}
        >
          <span className="text-xs text-muted-foreground/70 italic">
            {effect.notes}
          </span>
        </button>
      ) : !readOnly ? (
        <button
          type="button"
          onClick={() => setEditingNotes(true)}
          className="pl-6 text-left opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="text-xs text-muted-foreground/40 italic">
            + {t("notes")}
          </span>
        </button>
      ) : null}

      {/* Source label */}
      {effect.source && (
        <div className="pl-6">
          <span className="text-[10px] text-muted-foreground/50">
            {effect.source}
          </span>
        </div>
      )}
    </div>
  );
}
