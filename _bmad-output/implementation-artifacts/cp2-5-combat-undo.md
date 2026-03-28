# Story CP.2.5: Full Combat Undo (Enhanced)

Status: ready-for-dev

## Story

**Como** DM, **quero** desfazer qualquer ação de combate recente (não só HP) **para que** eu tenha confiança de que erros são corrigíveis com 1 clique.

## Context

O combat-store já tem `hpUndoStack` e `undoLastHpChange()` para desfazer dano/cura. Mas não desfaz:
- Condições adicionadas/removidas
- Combatentes marcados como derrotados
- Avanço de turno

A Shieldmaiden tem um undo completo e é uma das features que mais gera confiança no DM.

O keyboard shortcut `Ctrl+Z` já está mapeado para `undoLastHpChange()` em `useCombatKeyboardShortcuts.ts`.

**UX Assessment:** VERDE — Risco BAIXO. Rede de segurança invisível. Apenas a última ação, sem multi-undo infinito.

## Acceptance Criteria

1. Expand undo stack to support ALL combat actions:
   ```typescript
   // In lib/types/combat.ts — replace HpUndoEntry with:
   type UndoEntry =
     | { type: "hp"; combatantId: string; previousHp: number; previousTempHp: number; action: "damage" | "heal" | "temp" }
     | { type: "condition"; combatantId: string; condition: string; wasAdded: boolean }
     | { type: "defeated"; combatantId: string; wasDefeated: boolean }
     | { type: "turn"; previousTurnIndex: number; previousRound: number };
   ```

2. Update combat-store actions to push to unified undo stack:
   - `toggleCondition` → push `{ type: "condition", combatantId, condition, wasAdded }`
   - `setDefeated` → push `{ type: "defeated", combatantId, wasDefeated: previous }`
   - `advanceTurn` → push `{ type: "turn", previousTurnIndex, previousRound }`
   - `applyDamage`/`applyHealing`/`setTempHp` → keep existing HP undo behavior

3. Implement `undoLastAction()` in combat-store:
   - Pops from unified undo stack
   - Dispatches correct reversal based on `type`:
     - `hp` → restore previousHp and previousTempHp
     - `condition` → toggle condition back (remove if wasAdded, add if !wasAdded)
     - `defeated` → restore wasDefeated state
     - `turn` → restore previousTurnIndex and previousRound
   - Returns description string for toast: "Desfeito: [description]"

4. Toast feedback on undo:
   - Use `toast()` from sonner (already in project)
   - Format: "↩️ Desfeito: -12 HP em Goblin 1" / "↩️ Desfeito: Condição Frightened em Aldric"
   - Toast auto-dismisses in 3s
   - If stack is empty: toast "Nada para desfazer"

5. Update keyboard shortcut:
   - `Ctrl+Z` now calls `undoLastAction()` instead of `undoLastHpChange()`
   - Existing `undoLastHpChange()` kept for backwards compat but delegates to new system

6. Visual indicator:
   - No new permanent UI — undo lives purely in Ctrl+Z and KeyboardCheatsheet
   - Update KeyboardCheatsheet to show "Ctrl+Z: Desfazer última ação" (updated from "Desfazer HP")

## i18n Keys

- `combat.undo_hp`: "Desfeito: {amount} HP em {name}" / "Undone: {amount} HP on {name}"
- `combat.undo_condition_add`: "Desfeito: {condition} removido de {name}" / "Undone: {condition} removed from {name}"
- `combat.undo_condition_remove`: "Desfeito: {condition} restaurado em {name}" / "Undone: {condition} restored on {name}"
- `combat.undo_defeated`: "Desfeito: {name} não está mais derrotado" / "Undone: {name} is no longer defeated"
- `combat.undo_turn`: "Desfeito: turno revertido para round {round}" / "Undone: turn reverted to round {round}"
- `combat.undo_empty`: "Nada para desfazer" / "Nothing to undo"

## Technical Notes

- MAX_UNDO stays at 10 — covers one full round of combat
- Turn undo is the most complex: must check that the combat state hasn't diverged
- Undo does NOT broadcast to player view (DM corrects before players see the final state)
- Migration path: old `HpUndoEntry` entries in existing sessions treated as `{ type: "hp", ... }`
- No DB persistence for undo stack — purely client-side

## Out of Scope

- Multi-step undo (Ctrl+Z+Z+Z) — single action only for simplicity
- Redo (Ctrl+Y) — not worth the complexity
- Undo of combatant add/remove (already has `undoLastAdd`)
