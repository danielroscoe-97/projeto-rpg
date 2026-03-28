# Story CP.2.2: Concentration Tracking

Status: ready-for-dev

## Story

**Como** DM, **quero** que o sistema rastreie concentração automaticamente **para que** eu não esqueça de pedir saving throws quando um concentrador toma dano.

## Context

D&D 5e concentration rules:
- When a concentrating creature takes damage, it must make a CON save
- DC = max(10, Math.floor(damage / 2))
- If it fails, concentration breaks
- Only one concentration spell at a time

Currently conditions include the 13 standard D&D conditions but NOT "Concentrating". Concentration is tracked by player notes field (freeform text).

## Acceptance Criteria

1. Add "Concentrating" as a special condition:
   - Not a D&D condition — it's a game mechanic indicator
   - Show as a distinct badge (purple/blue) separate from regular conditions
   - DM can toggle it on any combatant
   - Optional label: "Concentrating: Bless" (DM types the spell name)

2. **Auto-prompt on damage:**
   - When a combatant with "Concentrating" takes damage:
     - Show alert/toast: "⚠️ Concentration Check! CON Save DC [max(10, floor(damage/2))]"
     - If combatant has CON save bonus (from monster data): show "CON Save: +5 vs DC 12"
     - Show "Roll Save" button that rolls 1d20 + CON save modifier
     - "Passed" → concentration maintained, log to combat log
     - "Failed" → auto-remove "Concentrating" condition, log to combat log
     - "Skip" → dismiss without action (DM handles manually)

3. **Player view:**
   - Show "Concentrating" badge on combatants that have it
   - When concentration check triggered: show brief "⚠️ Concentration!" indicator
   - Don't show the DC or roll result to players (DM announces)

4. **Broadcast:**
   - Broadcast `combat:condition_change` when concentration is toggled (same as other conditions)
   - Include "Concentrating" in conditions array

5. **UX for applying:**
   - In ConditionSelector: add "Concentrating" at the top with distinct styling
   - When toggling on: small input field appears for optional spell name
   - Keyboard shortcut: "X" to toggle concentration on selected combatant

## Technical Notes

- Store "Concentrating" in the conditions array as "concentrating" (lowercase)
- Store spell name in a new field or as "concentrating:Bless" format
- CON save modifier: lookup from SRD monster data via monster_id, or default to +0 for PCs
- Alert uses existing toast system, NOT a modal (non-blocking)
- The concentration check prompt should appear AUTOMATICALLY after damage is applied

## Tasks

- [ ] Add "Concentrating" to condition system (distinct from D&D conditions)
- [ ] Create ConcentrationBadge component (purple, shows spell name)
- [ ] Add concentration toggle to ConditionSelector (top, distinct styling)
- [ ] Optional spell name input when toggling on
- [ ] Auto-detect damage to concentrating combatant in applyDamage()
- [ ] Calculate DC: max(10, floor(damage / 2))
- [ ] Show concentration check prompt (toast with Roll/Pass/Fail/Skip)
- [ ] Roll CON save using monster data or default +0
- [ ] Auto-remove concentration on failed save
- [ ] Log all concentration events to combat log (CP.2.1)
- [ ] Broadcast concentration changes to player view
- [ ] Keyboard shortcut "X"
- [ ] i18n strings (pt-BR + en)
