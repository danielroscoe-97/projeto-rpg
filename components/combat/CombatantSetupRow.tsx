"use client";

import { useTranslations } from "next-intl";
import type { Combatant } from "@/lib/types/combat";
import { VersionBadge } from "@/components/session/RulesetSelector";

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
}: CombatantSetupRowProps) {
  const t = useTranslations("combat");
  const inputClass =
    "bg-transparent border border-transparent hover:border-border focus:border-ring focus:outline-none rounded px-1.5 py-1 text-foreground text-sm transition-colors min-h-[32px]";

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
            onInitiativeChange(combatant.id, Math.min(30, Math.max(-5, val)));
          }
        }}
        placeholder={t("setup_init_placeholder")}
        min={-5}
        max={30}
        className={`${inputClass} w-14 text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        aria-label={t("setup_init_aria", { name: combatant.name })}
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

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(combatant.id)}
        className="text-muted-foreground/40 hover:text-red-400 transition-colors text-xs w-14 flex-shrink-0 text-center opacity-0 group-hover:opacity-100 focus:opacity-100 min-h-[32px]"
        aria-label={t("setup_remove_aria", { name: combatant.name })}
        data-testid={`setup-remove-${combatant.id}`}
      >
        {t("setup_remove")}
      </button>
    </div>
  );
}
