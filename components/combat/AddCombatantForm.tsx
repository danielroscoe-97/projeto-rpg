"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCombatStore } from "@/lib/stores/combat-store";
import type { Combatant } from "@/lib/types/combat";

interface AddCombatantFormProps {
  onAdd: (combatant: Omit<Combatant, "id">) => void;
  onClose: () => void;
}

export function AddCombatantForm({ onAdd, onClose }: AddCombatantFormProps) {
  const t = useTranslations("combat");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const [maxHp, setMaxHp] = useState("");
  const [ac, setAc] = useState("");
  const [initiative, setInitiative] = useState("");
  const [dc, setDc] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMaxHp = parseInt(maxHp, 10);
    const parsedAc = parseInt(ac, 10);
    const parsedInit = parseInt(initiative, 10);
    const errors = new Set<string>();
    if (!name.trim()) errors.add("name");
    if (isNaN(parsedMaxHp) || parsedMaxHp < 1) errors.add("hp");
    if (isNaN(parsedAc) || parsedAc < 0) errors.add("ac");
    if (isNaN(parsedInit)) errors.add("initiative");
    if (errors.size > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors(new Set());

    // Auto-generate display_name if not provided
    const trimmedDisplay = displayName.trim();
    const existingCombatants = useCombatStore.getState().combatants;
    let maxN = 0;
    for (const c of existingCombatants) {
      if (!c.is_player && c.display_name) {
        const match = c.display_name.match(/#(\d+)$/);
        if (match) maxN = Math.max(maxN, parseInt(match[1], 10));
      }
    }
    const autoDisplay = trimmedDisplay || t("display_name_default", { n: maxN + 1 });

    onAdd({
      name: name.trim(),
      current_hp: parsedMaxHp,
      max_hp: parsedMaxHp,
      temp_hp: 0,
      ac: parsedAc,
      spell_save_dc: dc ? parseInt(dc, 10) || null : null,
      initiative: isNaN(parsedInit) ? null : parsedInit,
      initiative_order: null,
      conditions: [],
      ruleset_version: null,
      is_defeated: false,
      is_hidden: false,
      is_player: false,
      monster_id: null,
      token_url: null,
      creature_type: null,
      display_name: autoDisplay,
      monster_group_id: null,
      group_order: null,
      dm_notes: '',
      player_notes: '',
      player_character_id: null,
      combatant_role: "player",
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 bg-white/[0.04] rounded-md space-y-2"
      data-testid="add-combatant-form"
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">{t("add_name_label")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setFieldErrors((p) => { const n = new Set(p); n.delete("name"); return n; }); }}
            className={`w-full px-2 py-1 bg-white/[0.06] border border-border rounded text-foreground text-sm min-h-[32px]${fieldErrors.has("name") ? " field-error" : ""}`}
            aria-invalid={fieldErrors.has("name") || undefined}
            placeholder={t("add_name_placeholder")}
            data-testid="add-name-input"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t("add_hp_label")}</label>
          <input
            type="number"
            min="1"
            value={maxHp}
            onChange={(e) => { setMaxHp(e.target.value); setFieldErrors((p) => { const n = new Set(p); n.delete("hp"); return n; }); }}
            onFocus={(e) => e.target.select()}
            className={`w-full px-2 py-1 bg-white/[0.06] border border-border rounded text-foreground text-sm font-mono min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none${fieldErrors.has("hp") ? " field-error" : ""}`}
            aria-invalid={fieldErrors.has("hp") || undefined}
            data-testid="add-hp-input"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t("add_ac_label")}</label>
          <input
            type="number"
            min="0"
            value={ac}
            onChange={(e) => { setAc(e.target.value); setFieldErrors((p) => { const n = new Set(p); n.delete("ac"); return n; }); }}
            onFocus={(e) => e.target.select()}
            className={`w-full px-2 py-1 bg-white/[0.06] border border-border rounded text-foreground text-sm font-mono min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none${fieldErrors.has("ac") ? " field-error" : ""}`}
            aria-invalid={fieldErrors.has("ac") || undefined}
            data-testid="add-ac-input"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t("add_init_label")}</label>
          <input
            type="number"
            min="-5"
            max="50"
            value={initiative}
            onChange={(e) => { setInitiative(e.target.value); setFieldErrors((p) => { const n = new Set(p); n.delete("initiative"); return n; }); }}
            onFocus={(e) => e.target.select()}
            className={`w-full px-2 py-1 bg-white/[0.06] border border-border rounded text-foreground text-sm font-mono min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none${fieldErrors.has("initiative") ? " field-error" : ""}`}
            aria-invalid={fieldErrors.has("initiative") || undefined}
            data-testid="add-initiative-input"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">{t("display_name_label")}</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            className="w-full px-2 py-1 bg-white/[0.06] border border-border rounded text-foreground text-sm min-h-[32px]"
            placeholder={t("display_name_placeholder")}
            data-testid="add-display-name-input"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t("add_spell_dc_label")}</label>
          <input
            type="number"
            min="0"
            value={dc}
            onChange={(e) => setDc(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder={tc("dash")}
            className="w-full px-2 py-1 bg-white/[0.06] border border-border rounded text-foreground text-sm font-mono min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid="add-dc-input"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 text-muted-foreground hover:text-foreground/80 text-xs min-h-[32px]"
          data-testid="add-cancel-btn"
        >
          {tc("cancel")}
        </button>
        <button
          type="submit"
          className="px-3 py-1 bg-gold text-foreground text-xs font-medium rounded transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[32px]"
          data-testid="add-submit-btn"
        >
          {t("add_to_combat")}
        </button>
      </div>
    </form>
  );
}
