"use client";

import { useState } from "react";
import type { Combatant } from "@/lib/types/combat";

interface AddCombatantFormProps {
  onAdd: (combatant: Omit<Combatant, "id">) => void;
  onClose: () => void;
}

export function AddCombatantForm({ onAdd, onClose }: AddCombatantFormProps) {
  const [name, setName] = useState("");
  const [maxHp, setMaxHp] = useState("");
  const [ac, setAc] = useState("");
  const [initiative, setInitiative] = useState("");
  const [dc, setDc] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedMaxHp = parseInt(maxHp, 10);
    const parsedAc = parseInt(ac, 10);
    const parsedInit = parseInt(initiative, 10);
    if (!name.trim() || isNaN(parsedMaxHp) || isNaN(parsedAc)) return;

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
      is_player: false,
      monster_id: null,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 bg-white/5 rounded-md space-y-2"
      data-testid="add-combatant-form"
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-xs text-white/50 block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm min-h-[32px]"
            placeholder="Combatant name"
            data-testid="add-name-input"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">HP</label>
          <input
            type="number"
            min="1"
            value={maxHp}
            onChange={(e) => setMaxHp(e.target.value)}
            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm font-mono min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid="add-hp-input"
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
            data-testid="add-ac-input"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1">Initiative</label>
          <input
            type="number"
            min="-5"
            max="30"
            value={initiative}
            onChange={(e) => setInitiative(e.target.value)}
            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm font-mono min-h-[32px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            data-testid="add-initiative-input"
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
            data-testid="add-dc-input"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 text-white/40 hover:text-white/70 text-xs min-h-[32px]"
          data-testid="add-cancel-btn"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-1 bg-[#e94560] text-white text-xs font-medium rounded hover:bg-[#c73652] transition-colors min-h-[32px]"
          data-testid="add-submit-btn"
        >
          Add to Combat
        </button>
      </div>
    </form>
  );
}
