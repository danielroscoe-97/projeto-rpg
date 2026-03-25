"use client";

import { useTranslations } from "next-intl";
import type { Combatant } from "@/lib/types/combat";
import { VersionBadge } from "@/components/session/RulesetSelector";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";

interface CombatantSetupRowProps {
  combatant: Combatant;
  onInitiativeChange: (id: string, value: number | null) => void;
  onNameChange: (id: string, name: string) => void;
  onHpChange: (id: string, hp: number) => void;
  onAcChange: (id: string, ac: number) => void;
  onNotesChange: (id: string, notes: string) => void;
  onRemove: (id: string) => void;
  /** Props from @dnd-kit useSortable — spread on drag handle */
  dragHandleProps?: Record<string, unknown>;
  /** Highlight the initiative field as invalid */
  highlightInit?: boolean;
}

export function CombatantSetupRow({
  combatant,
  onInitiativeChange,
  onNameChange,
  onHpChange,
  onAcChange,
  onNotesChange,
  onRemove,
  dragHandleProps,
  highlightInit,
}: CombatantSetupRowProps) {
  const t = useTranslations("combat");
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const inputClass =
    "bg-transparent border border-transparent hover:border-border focus:border-ring focus:outline-none rounded px-1.5 py-1 text-foreground text-sm transition-colors min-h-[32px]";

  const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  return (
    <div
      className="flex items-center gap-1.5 bg-card border border-white/[0.04] rounded-md px-2 py-1.5 hover:bg-white/[0.02] group"
      data-testid={`setup-row-${combatant.id}`}
    >
      {/* Drag handle */}
      <span
        className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing select-none text-sm w-5 text-center flex-shrink-0"
        aria-label={t("drag_to_reorder")}
        {...dragHandleProps}
      >
        ⠿
      </span>

      {/* Init */}
      <input
        type="number"
        value={combatant.initiative ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onInitiativeChange(combatant.id, null);
            return;
          }
          const val = Number(raw);
          if (!isNaN(val)) {
            onInitiativeChange(combatant.id, Math.min(50, Math.max(-5, val)));
          }
        }}
        onFocus={selectOnFocus}
        placeholder={t("setup_init_placeholder")}
        min={-5}
        max={50}
        className={`${inputClass} w-14 text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none${highlightInit ? " field-error" : ""}`}
        aria-label={t("setup_init_aria", { name: combatant.name })}
        aria-invalid={highlightInit || undefined}
        data-testid={`setup-init-${combatant.id}`}
      />

      {/* Name */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <input
          type="text"
          value={combatant.name}
          onChange={(e) => onNameChange(combatant.id, e.target.value)}
          placeholder={t("setup_name_placeholder")}
          className={`${inputClass} flex-1 min-w-0`}
          aria-label={t("setup_name_aria")}
          data-testid={`setup-name-${combatant.id}`}
        />
        {combatant.is_player && (
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider flex-shrink-0">
            {t("setup_player_badge")}
          </span>
        )}
        {combatant.ruleset_version && (
          <span className="flex-shrink-0">
            <VersionBadge version={combatant.ruleset_version} />
          </span>
        )}
      </div>

      {/* HP */}
      <input
        type="number"
        value={combatant.max_hp || ""}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          if (!isNaN(val) && val >= 0) {
            onHpChange(combatant.id, val);
          }
        }}
        onFocus={selectOnFocus}
        placeholder={t("setup_hp_placeholder")}
        min={1}
        className={`${inputClass} w-16 text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        aria-label={t("setup_hp_aria", { name: combatant.name })}
        data-testid={`setup-hp-${combatant.id}`}
      />

      {/* AC */}
      <input
        type="number"
        value={combatant.ac || ""}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          if (!isNaN(val) && val >= 0) {
            onAcChange(combatant.id, val);
          }
        }}
        onFocus={selectOnFocus}
        placeholder={t("setup_ac_placeholder")}
        min={1}
        className={`${inputClass} w-14 text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        aria-label={t("setup_ac_aria", { name: combatant.name })}
        data-testid={`setup-ac-${combatant.id}`}
      />

      {/* Notes */}
      <input
        type="text"
        value={combatant.player_notes}
        onChange={(e) => onNotesChange(combatant.id, e.target.value)}
        placeholder={t("setup_notes_placeholder")}
        className={`${inputClass} flex-1 min-w-0 text-muted-foreground`}
        aria-label={t("setup_notes_aria", { name: combatant.name })}
        data-testid={`setup-notes-${combatant.id}`}
      />

      {/* Actions — fixed width so columns stay aligned regardless of Ver Ficha */}
      <div className="w-[140px] flex-shrink-0 flex items-center justify-end gap-1">
        {combatant.monster_id && combatant.ruleset_version && (
          <button
            type="button"
            onClick={() => pinCard("monster", combatant.monster_id!, combatant.ruleset_version!)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground/60 hover:text-gold hover:bg-gold/10 rounded transition-all flex-shrink-0 border border-transparent hover:border-gold/30"
            aria-label={`Ver ficha de ${combatant.name}`}
            data-testid={`ver-ficha-setup-${combatant.id}`}
          >
            <span aria-hidden>📖</span>
            <span>Ver Ficha</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(combatant.id)}
          className="text-muted-foreground/40 hover:text-red-400 transition-colors text-xs flex-1 text-center min-h-[32px]"
          aria-label={t("setup_remove_aria", { name: combatant.name })}
          data-testid={`setup-remove-${combatant.id}`}
        >
          {t("setup_remove")}
        </button>
      </div>
    </div>
  );
}
