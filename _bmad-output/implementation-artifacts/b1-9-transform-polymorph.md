# Story B.1.9: Transform/Polymorph Tracking

Status: ready-for-dev — NEEDS DISCUSSION

## Story

**Como** DM, **quero** rastrear transformações (Wildshape, Polymorph) com HP pool separado **para que** o sistema gerencie automaticamente a transição entre forma original e transformada.

## Context

D&D 5e Wild Shape / Polymorph rules:
- Creature gains new HP pool (beast's HP), new AC, new attacks
- When transformed HP reaches 0, creature reverts to original form
- Excess damage carries over to original form's HP
- Original stats are preserved and restored on reversion

A Shieldmaiden tem um botão dedicado de transform com seleção de besta.

**UX Assessment:** VERMELHO — Risco ALTO. Dual HP bar, novo fluxo completo, form de seleção de besta. Usada em ~20% dos combates (só com druid/polymorph). O custo de UI é desproporcional. **ESPECIFICAR PARA REFERÊNCIA FUTURA, NÃO CODAR AGORA.** O DM já pode editar HP inline como workaround.

## Acceptance Criteria (Future Implementation)

1. Add transform state to Combatant:
   ```typescript
   interface TransformState {
     originalHp: number;
     originalMaxHp: number;
     originalTempHp: number;
     originalAc: number;
     transformedFormName: string;   // "Brown Bear", "Giant Eagle"
     transformedMonsterId?: string; // SRD monster ID for stat block
   }

   // Add to Combatant:
   transform?: TransformState | null;
   ```

2. Transform action in combat-store:
   - `transformCombatant(id, targetMonsterId)`:
     - Save original HP/AC/temp_hp to `transform` field
     - Set new HP/AC from target monster's stats
     - Update display with transformed form name
   - `revertTransform(id)`:
     - Restore original HP/AC/temp_hp from `transform`
     - Clear `transform` field
   - Auto-revert: when transformed combatant reaches 0 HP:
     - Calculate excess damage: `abs(new_current_hp)` (since it went below 0)
     - Revert to original form
     - Apply excess damage to original HP

3. UI — Transform button in CombatantRow:
   - Paw icon (🐾) appears for combatants that could transform (any non-defeated)
   - Click opens a mini monster search (reuse MonsterSearchPanel) filtered to beasts
   - Once selected: row shows dual identity — "Aldric → Brown Bear"
   - HP bar shows transformed HP
   - Small "Revert" button appears while transformed

4. Player View:
   - Show transformed form name instead of character name while transformed
   - HP status reflects transformed HP

5. Combat Log integration:
   - Log "Aldric transformed into Brown Bear (34 HP)"
   - Log "Brown Bear reverted to Aldric (excess damage: 5)"

6. Undo support:
   - Transform and revert are undoable actions
   - Undo transform = revert; undo revert = re-transform with saved state

## Technical Notes

- Transform state is purely client-side (no DB schema change needed for V1)
- The monster search for beast selection can reuse existing MonsterSearchPanel with type filter
- Excess damage calculation: `const excess = Math.abs(Math.min(0, transformedHp - damage))`
- Consideration: multiple transforms per combatant (e.g., druid uses Wild Shape twice) — handle as stack?

## Why Deferred

- **20% usage rate** — most combats don't involve transformation
- **High UI cost** — dual HP display, transform button, beast selector, revert button
- **Manual workaround exists** — DM can edit HP/AC inline today to simulate transform
- **Better ROI** — other features (leaderboard, hidden NPCs) benefit 100% of combats
- **Revisit when** — the combat UI is stable and we're looking for power-user features (Q3 2026)

## Estimated Effort

- Size: G (Grande — 3+ dias)
- Risk: Medium (dual state management is tricky)
- Dependencies: None (standalone feature)
