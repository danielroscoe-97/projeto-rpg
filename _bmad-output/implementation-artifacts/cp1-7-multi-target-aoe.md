# Story CP.1.7: Multi-target AoE Damage

Status: ready-for-dev

## Story

**Como** DM, **quero** aplicar dano em múltiplos alvos de uma vez **para que** Fireball em 5 goblins não exija 5 cliques separados.

## Context

Atualmente o HpAdjuster (`components/combat/HpAdjuster.tsx`) opera em 1 combatant por vez. Para AoE spells (Fireball, Dragon Breath, etc.), o DM precisa abrir HP → digitar dano → fechar → abrir outro → repetir. Isso é lento e propenso a erros.

A Shieldmaiden usa Shift+Click para multi-seleção de alvos. Mas no mobile não existe Shift+Click.

**UX Assessment:** AMARELO — Risco MÉDIO. Solução: NÃO criar um modo de seleção permanente. Em vez disso, embutir a multi-seleção DENTRO do HpAdjuster existente (extend, don't create).

## Acceptance Criteria

1. Add "Apply to multiple" toggle inside HpAdjuster:
   - When HpAdjuster opens for a combatant, show a small link/button: "Aplicar em mais alvos"
   - Clicking reveals a compact checklist of OTHER non-defeated combatants (excluding the primary target)
   - Each entry: checkbox + name + HP indicator
   - Checkboxes default to unchecked
   - DM checks the additional targets, types damage, hits Apply
   - Damage is applied to ALL checked targets + the primary target

2. Update HpAdjuster component:
   ```typescript
   interface HpAdjusterProps {
     // existing props...
     /** All combatants for multi-target selection */
     allCombatants?: Combatant[];
     /** Primary target ID */
     primaryTargetId?: string;
     /** Callback for applying to multiple targets */
     onApplyToMultiple?: (targetIds: string[], amount: number, mode: HpMode) => void;
   }
   ```

3. Multi-target UI layout (mobile-first):
   ```
   ┌─────────────────────────┐
   │ [Damage] [Heal] [Temp]  │
   │ ┌─────────────────────┐ │
   │ │  [___42___] [Apply]  │ │
   │ │  [½]                 │ │
   │ └─────────────────────┘ │
   │                          │
   │ ▸ Aplicar em mais alvos  │  ← toggle (collapsed by default)
   │ ┌─────────────────────┐ │
   │ │ ☐ Goblin 1  (15 HP) │ │  ← expanded checklist
   │ │ ☐ Goblin 2  (15 HP) │ │
   │ │ ☑ Goblin 3  (8 HP)  │ │
   │ │ ☐ Aldric    (32 HP) │ │
   │ │ [Selecionar todos]   │ │
   │ └─────────────────────┘ │
   └─────────────────────────┘
   ```

4. "Selecionar todos" / "Desmarcar todos" toggle button in the checklist

5. When applied to multiple targets:
   - Call `onApplyDamage` / `onApplyHealing` for each target sequentially
   - Each application generates its own combat log entry and undo entry
   - Toast shows: "Dano aplicado em {count} alvos" / "Damage applied to {count} targets"
   - Half damage toggle applies to ALL targets equally

6. Keyboard shortcut integration:
   - When HpAdjuster is open and multi-target is expanded:
     - Number keys 1-9 toggle checkboxes by position
     - `A` toggles "select all"

7. MonsterActionBar integration:
   - When a save-type action (e.g., Fire Breath DC 15) is used:
     - After rolling damage, show multi-target selector automatically
     - Pre-check all targets that were in the "targets" area
     - "Failed Save" applies full damage, "Passed Save" applies half (per CP.1.5)

## i18n Keys

- `combat.hp_multi_target`: "Aplicar em mais alvos" / "Apply to more targets"
- `combat.hp_select_all`: "Selecionar todos" / "Select all"
- `combat.hp_deselect_all`: "Desmarcar todos" / "Deselect all"
- `combat.hp_applied_multiple`: "Aplicado em {count} alvos" / "Applied to {count} targets"

## Technical Notes

- The checklist is collapsed by default — 90% of damage is single-target, so no visual overhead
- On mobile, the checklist scrolls within the HpAdjuster popover (max-height: 200px)
- Each target application is atomic — if one fails, the others still apply
- Undo integration: each target gets its own undo entry, so Ctrl+Z undoes one at a time
- No new components needed — extends HpAdjuster inline

## Out of Scope

- Drag-to-select on desktop (Shift+Click pattern) — too complex for V1
- Different damage amounts per target (e.g., save halving per-target in V1 is all-or-nothing)
- Visual AoE radius on a map (we don't have maps)
