"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, EyeOff, Shield, User, UserCircle, Sparkles, Skull } from "lucide-react";
import type { Combatant, CombatantRole } from "@/lib/types/combat";
import { COMBATANT_ROLE_CYCLE } from "@/lib/types/combat";
import { VersionBadge } from "@/components/session/RulesetSelector";
import { MonsterToken } from "@/components/srd/MonsterToken";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const ROLE_CONFIG: Record<CombatantRole, { icon: typeof User; color: string }> = {
  player: { icon: User, color: "text-blue-400 hover:text-blue-300 border-blue-400/30 hover:border-blue-400/50" },
  npc: { icon: UserCircle, color: "text-gold hover:text-gold-light border-gold/30 hover:border-gold/50" },
  summon: { icon: Sparkles, color: "text-purple-400 hover:text-purple-300 border-purple-400/30 hover:border-purple-400/50" },
  monster: { icon: Skull, color: "text-red-400 hover:text-red-300 border-red-400/30 hover:border-red-400/50" },
};

interface CombatantSetupRowProps {
  combatant: Combatant;
  onInitiativeChange: (id: string, value: number | null) => void;
  onNameChange: (id: string, name: string) => void;
  onHpChange: (id: string, hp: number) => void;
  onAcChange: (id: string, ac: number) => void;
  onNotesChange: (id: string, notes: string) => void;
  onRemove: (id: string) => void;
  /** Duplicate this combatant with same stats */
  onDuplicate?: (combatant: Combatant) => void;
  /** Roll initiative for this combatant (1d20 + DEX mod if available) */
  onRollInitiative?: (id: string) => void;
  /** Update the anti-metagame display name for this combatant */
  onDisplayNameChange?: (id: string, displayName: string | null) => void;
  /** Cycle the visual role for manually-added combatants */
  onRoleChange?: (id: string, role: CombatantRole) => void;
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
  onDuplicate,
  onRollInitiative,
  onDisplayNameChange,
  onRoleChange,
  dragHandleProps,
  highlightInit,
}: CombatantSetupRowProps) {
  const t = useTranslations("combat");
  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasValue, setAliasValue] = useState(combatant.display_name ?? "");
  const inputClass =
    "bg-transparent border border-transparent hover:border-border focus:border-ring focus:outline-none rounded px-1.5 py-1 text-foreground text-sm transition-colors min-h-[32px]";

  const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  return (
    <div
      className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 md:grid md:gap-x-1.5 md:items-center bg-card border rounded-md px-2 py-1.5 hover:bg-white/[0.02] group${combatant.is_hidden ? " border-dashed border-purple-500/40 opacity-80" : " border-white/[0.04]"}`}
      style={{ gridTemplateColumns: "20px 64px 32px 1fr 64px 56px 1fr 170px" }}
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
      <div className="flex items-center gap-0.5 w-12 md:w-auto flex-shrink-0">
        <input
          type="text"
          inputMode="numeric"
          pattern="-?[0-9]*"
          value={combatant.initiative ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "" || raw === "-") {
              onInitiativeChange(combatant.id, null);
              return;
            }
            if (/^-?\d+$/.test(raw)) {
              onInitiativeChange(combatant.id, Number(raw));
            }
          }}
          onBlur={(e) => {
            const val = Number(e.target.value);
            if (!isNaN(val) && e.target.value !== "") {
              onInitiativeChange(combatant.id, Math.min(50, Math.max(-5, val)));
            }
          }}
          onFocus={selectOnFocus}
          placeholder={t("setup_init_placeholder")}
          className={`${inputClass} w-10 text-center font-mono${highlightInit ? " field-error" : ""}`}
          aria-label={t("setup_init_aria", { name: combatant.name })}
          aria-invalid={highlightInit || undefined}
          data-testid={`setup-init-${combatant.id}`}
        />
        {onRollInitiative && (
          <button
            type="button"
            onClick={() => onRollInitiative(combatant.id)}
            className="text-muted-foreground/40 hover:text-gold transition-colors text-xs flex-shrink-0 p-0.5"
            title={t("roll_init_single")}
            aria-label={t("roll_init_single_aria", { name: combatant.name })}
            data-testid={`roll-init-${combatant.id}`}
          >
            🎲
          </button>
        )}
        {combatant.initiative_breakdown && combatant.initiative !== null && (
          <span className="text-[10px] text-muted-foreground/50 font-mono whitespace-nowrap hidden md:inline">
            ({combatant.initiative_breakdown.roll}{combatant.initiative_breakdown.modifier >= 0 ? "+" : "−"}{Math.abs(combatant.initiative_breakdown.modifier)})
          </span>
        )}
      </div>

      {/* Monster token — visual on mobile (24px), clickable on desktop (32px) */}
      {combatant.monster_id ? (
        <>
          {/* Mobile: visual-only token (24px forced via inline style to override sizeClass) */}
          <span className="block md:hidden flex-shrink-0 rounded-full overflow-hidden w-6 h-6" style={{ fontSize: 10 }}>
            <MonsterToken
              tokenUrl={combatant.token_url ?? undefined}
              creatureType={combatant.creature_type ?? undefined}
              name={combatant.name}
              size={24}
            />
          </span>
          {/* Desktop: clickable token */}
          <button
            type="button"
            onClick={() => {
              if (combatant.monster_id && combatant.ruleset_version) {
                pinCard("monster", combatant.monster_id, combatant.ruleset_version);
              }
            }}
            className={`hidden md:block flex-shrink-0 rounded-full ${combatant.ruleset_version ? "cursor-pointer hover:ring-2 hover:ring-gold/60 transition-shadow" : "cursor-default"}`}
            disabled={!combatant.ruleset_version}
            aria-label={combatant.ruleset_version ? t("setup_view_card_aria", { name: combatant.name }) : undefined}
            data-testid={`token-btn-${combatant.id}`}
          >
            <MonsterToken
              tokenUrl={combatant.token_url ?? undefined}
              creatureType={combatant.creature_type ?? undefined}
              name={combatant.name}
              size={32}
            />
          </button>
        </>
      ) : (
        <span className="w-6 md:w-auto flex-shrink-0" />
      )}

      {/* Name */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
        <input
          type="text"
          value={combatant.name}
          onChange={(e) => onNameChange(combatant.id, e.target.value)}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
          placeholder={t("setup_name_placeholder")}
          className={`${inputClass} flex-1 min-w-0`}
          aria-label={t("setup_name_aria")}
          data-testid={`setup-name-${combatant.id}`}
        />
        {!combatant.is_player && combatant.display_name && !editingAlias && (
          <button
            type="button"
            onClick={() => {
              setAliasValue(combatant.display_name ?? "");
              setEditingAlias(true);
            }}
            className="flex items-center gap-0.5 text-xs text-muted-foreground/40 hover:text-purple-400 font-normal ml-1 transition-colors"
            title={t("setup_alias_tooltip")}
            data-testid={`alias-btn-${combatant.id}`}
          >
            <Shield className="w-3 h-3" />
            <span className="truncate max-w-[80px] md:max-w-[120px]">{combatant.display_name}</span>
          </button>
        )}
        {!combatant.is_player && editingAlias && (
          <input
            type="text"
            value={aliasValue}
            onChange={(e) => setAliasValue(e.target.value)}
            onBlur={() => {
              const trimmed = aliasValue.trim();
              onDisplayNameChange?.(combatant.id, trimmed || null);
              setEditingAlias(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditingAlias(false);
            }}
            placeholder={t("setup_alias_placeholder")}
            className={`${inputClass} w-28 text-xs text-purple-400 ml-1`}
            autoFocus
            data-testid={`alias-input-${combatant.id}`}
          />
        )}
        {combatant.ruleset_version && (
          <span className="flex-shrink-0">
            <VersionBadge version={combatant.ruleset_version} />
          </span>
        )}
        {combatant.is_hidden && (
          <span className="flex-shrink-0 inline-flex items-center gap-0.5 text-[10px] text-purple-400 font-medium px-1.5 py-0.5 bg-purple-900/20 border border-purple-500/30 rounded">
            <EyeOff className="w-3 h-3" />
            <span className="hidden md:inline">{t("hidden_indicator")}</span>
          </span>
        )}
      </div>

      {/* Quebra de linha no mobile — hidden in desktop grid */}
      <div className="w-full h-0 md:hidden" aria-hidden="true" />

      {/* HP + CA grouped for mobile second line */}
      <div className="flex items-center gap-1.5 md:contents">
        {/* HP */}
        <span className="text-[10px] text-muted-foreground/50 uppercase md:hidden">HP</span>
        <input
          type="number"
          value={combatant.max_hp || ""}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 1) {
              onHpChange(combatant.id, val);
            }
          }}
          onFocus={selectOnFocus}
          placeholder={t("setup_hp_placeholder")}
          min={1}
          className={`${inputClass} w-12 md:w-full text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          aria-label={t("setup_hp_aria", { name: combatant.name })}
          data-testid={`setup-hp-${combatant.id}`}
        />

        {/* AC */}
        <span className="text-[10px] text-muted-foreground/50 uppercase md:hidden">CA</span>
        <input
          type="number"
          value={combatant.ac || ""}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 1) {
              onAcChange(combatant.id, val);
            }
          }}
          onFocus={selectOnFocus}
          placeholder={t("setup_ac_placeholder")}
          min={1}
          className={`${inputClass} w-10 md:w-full text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          aria-label={t("setup_ac_aria", { name: combatant.name })}
          data-testid={`setup-ac-${combatant.id}`}
        />
      </div>

      {/* Notes — hidden on mobile to save space */}
      <input
        type="text"
        value={combatant.player_notes}
        onChange={(e) => onNotesChange(combatant.id, e.target.value)}
        placeholder={t("setup_notes_placeholder")}
        className={`${inputClass} hidden md:block w-full min-w-0 text-muted-foreground`}
        aria-label={t("setup_notes_aria", { name: combatant.name })}
        data-testid={`setup-notes-${combatant.id}`}
      />

      {/* Actions — responsive width */}
      <div className="flex-shrink-0 flex items-center justify-end gap-1 ml-auto md:ml-0 md:w-auto">
        {combatant.is_player && (
          <span className="text-[10px] text-blue-400/70 uppercase tracking-wider flex-shrink-0 px-1.5 py-0.5 border border-blue-400/20 rounded">
            {t("setup_player_badge")}
          </span>
        )}
        {combatant.monster_id && combatant.ruleset_version && (
          <button
            type="button"
            onClick={() => pinCard("monster", combatant.monster_id!, combatant.ruleset_version!)}
            className="flex items-center justify-center gap-1 px-2 py-1 text-xs text-muted-foreground/60 hover:text-gold hover:bg-gold/10 rounded transition-all flex-shrink-0 border border-transparent hover:border-gold/30 min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-0"
            aria-label={t("setup_view_card_aria", { name: combatant.name })}
            data-testid={`ver-ficha-setup-${combatant.id}`}
          >
            <span aria-hidden>📖</span>
            <span className="hidden md:inline">{t("setup_view_card")}</span>
          </button>
        )}
        {!combatant.monster_id && combatant.combatant_role && onRoleChange && (() => {
          const role = combatant.combatant_role!;
          const config = ROLE_CONFIG[role];
          const Icon = config.icon;
          const roleLabel = t(`setup_role_${role}`);
          const nextRole = COMBATANT_ROLE_CYCLE[(COMBATANT_ROLE_CYCLE.indexOf(role) + 1) % COMBATANT_ROLE_CYCLE.length];
          return (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onRoleChange(combatant.id, nextRole)}
                    className={`flex items-center justify-center gap-1 px-2 py-1 text-xs rounded transition-all flex-shrink-0 border min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-0 ${config.color}`}
                    data-testid={`role-btn-${combatant.id}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{roleLabel}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {t("setup_role_tooltip")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })()}
        {onDuplicate && (
          <button
            type="button"
            onClick={() => onDuplicate(combatant)}
            className="text-muted-foreground/40 hover:text-gold transition-colors text-xs min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-0 px-1 flex items-center justify-center"
            aria-label={t("setup_duplicate_aria", { name: combatant.name })}
            title={t("setup_duplicate")}
            data-testid={`setup-duplicate-${combatant.id}`}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" className="text-muted-foreground/40 hover:text-red-400 transition-colors text-xs text-center min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-0 flex items-center justify-center" aria-label={t("setup_remove_aria", { name: combatant.name })} data-testid={`setup-remove-${combatant.id}`}>
              {t("setup_remove")}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("setup_remove_confirm_title", { name: combatant.name })}</AlertDialogTitle>
              <AlertDialogDescription>{t("setup_remove_confirm_desc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("setup_remove_confirm_cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => onRemove(combatant.id)} className="bg-red-900/60 text-red-300 hover:bg-red-900/80">{t("setup_remove_confirm_action")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
