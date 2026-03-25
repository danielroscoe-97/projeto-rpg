"use client";

import { useState } from "react";
import type { Combatant } from "@/lib/types/combat";

interface StatsEditorProps {
  combatant: Combatant;
  onSave: (stats: { name?: string; max_hp?: number; ac?: number; spell_save_dc?: number | null }) => void;
  onClose: () => void;
}

export function StatsEditor({ combatant, onSave, onClose }: StatsEditorProps) {
  const [name, setName] = useState(combatant.name);
  const [maxHp, setMaxHp] = useState(String(combatant.max_hp));
  const [ac, setAc] = useState(String(combatant.ac));
  const [dc, setDc] = useState(combatant.spell_save_dc !== null ? String(combatant.spell_save_dc) : "");

  const handleSave = () => {
    const stats: { name?: string; max_hp?: number; ac?: number; spell_save_dc?: number | null } = {};
    if (name !== combatant.name) stats.name = name;
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
      className="mt-2 p-3 bg-white/5 rounded-md space-y-2"
      data-testid="stats-editor"
      onKeyDown={handleKeyDown}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-white/50 block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm min-h-[32px]"
            data-testid="stats-name-input"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Max HP</label>
          <input
            type="number"
            min="1"
            value={maxHp}
            onChange={(e) => setMaxHp(e.target.value)}
            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm font-mono min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid="stats-maxhp-input"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">AC</label>
          <input
            type="number"
            min="0"
            value={ac}
            onChange={(e) => setAc(e.target.value)}
            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm font-mono min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid="stats-ac-input"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Spell DC</label>
          <input
            type="number"
            min="0"
            value={dc}
            onChange={(e) => setDc(e.target.value)}
            placeholder="—"
            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm font-mono min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid="stats-dc-input"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 text-white/40 hover:text-white/70 text-xs min-h-[32px]"
          data-testid="stats-cancel-btn"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1 bg-[#e94560] text-white text-xs font-medium rounded hover:bg-[#c73652] transition-colors min-h-[32px]"
          data-testid="stats-save-btn"
        >
          Save
        </button>
      </div>
    </div>
  );
}
