"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Combatant } from "@/lib/types/combat";
import { generateCreatureName } from "@/lib/utils/creature-name-generator";
import { useCombatStore } from "@/lib/stores/combat-store";

interface StatsEditorProps {
  combatant: Combatant;
  onSave: (stats: { name?: string; display_name?: string | null; max_hp?: number; ac?: number; spell_save_dc?: number | null }) => void;
  onClose: () => void;
}

export function StatsEditor({ combatant, onSave, onClose }: StatsEditorProps) {
  const t = useTranslations("combat");
  const tc = useTranslations("common");
  const [name, setName] = useState(combatant.name);
  // Auto-generate display_name if null for non-player combatants (Bug #28)
  const [displayName, setDisplayName] = useState(() => {
    if (combatant.display_name) return combatant.display_name;
    if (combatant.is_player) return "";
    const existingNames = useCombatStore.getState().combatants
      .filter((c) => !c.is_player && c.display_name && c.id !== combatant.id)
      .map((c) => c.display_name!);
    return generateCreatureName(combatant.creature_type, existingNames);
  });
  const [maxHp, setMaxHp] = useState(String(combatant.max_hp));
  const [ac, setAc] = useState(String(combatant.ac));
  const [dc, setDc] = useState(combatant.spell_save_dc !== null ? String(combatant.spell_save_dc) : "");

  const showDisplayName = !combatant.is_player;

  const handleSave = () => {
    const stats: { name?: string; display_name?: string | null; max_hp?: number; ac?: number; spell_save_dc?: number | null } = {};
    if (name !== combatant.name) stats.name = name;
    if (showDisplayName) {
      const trimmed = displayName.trim() || null;
      if (trimmed !== combatant.display_name) stats.display_name = trimmed;
    }
    const parsedMaxHp = parseInt(maxHp, 10);
    if (!isNaN(parsedMaxHp) && parsedMaxHp > 0 && parsedMaxHp !== combatant.max_hp) stats.max_hp = parsedMaxHp;
    const parsedAc = parseInt(ac, 10);
    if (!isNaN(parsedAc) && parsedAc !== combatant.ac) stats.ac = parsedAc;
    const parsedDc = dc === "" ? null : parseInt(dc, 10);
    if (parsedDc !== combatant.spell_save_dc) stats.spell_save_dc = parsedDc;
    if (Object.keys(stats).length > 0) onSave(stats);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="mt-2 p-3 bg-white/[0.04] rounded-md space-y-2"
      data-testid="stats-editor"
      onKeyDown={handleKeyDown}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t("stats_name_label")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2 py-1 bg-white/[0.06] border border-border rounded text-foreground text-sm min-h-[32px]"
            data-testid="stats-name-input"
          />
        </div>
        {showDisplayName && (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">{t("display_name_label")}</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder={t("display_name_placeholder")}
              className="w-full px-2 py-1 bg-white/[0.06] border border-border rounded text-foreground text-sm min-h-[32px]"
              data-testid="stats-display-name-input"
            />
          </div>
        )}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t("stats_max_hp_label")}</label>
          <input
            type="number"
            min="1"
            value={maxHp}
            onChange={(e) => setMaxHp(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full px-2 py-1 bg-white/[0.06] border border-border rounded text-foreground text-sm font-mono min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid="stats-maxhp-input"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t("stats_ac_label")}</label>
          <input
            type="number"
            min="0"
            value={ac}
            onChange={(e) => setAc(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full px-2 py-1 bg-white/[0.06] border border-border rounded text-foreground text-sm font-mono min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid="stats-ac-input"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t("stats_spell_dc_label")}</label>
          <input
            type="number"
            min="0"
            value={dc}
            onChange={(e) => setDc(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder={tc("dash")}
            className="w-full px-2 py-1 bg-white/[0.06] border border-border rounded text-foreground text-sm font-mono min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid="stats-dc-input"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 text-muted-foreground hover:text-foreground/80 text-xs min-h-[32px]"
          data-testid="stats-cancel-btn"
        >
          {tc("cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1 bg-gold text-foreground text-xs font-medium rounded transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[32px]"
          data-testid="stats-save-btn"
        >
          {tc("save")}
        </button>
      </div>
    </div>
  );
}
