# Story CP.2.3: Contextual Save Prompts

Status: ready-for-dev

## Story

**Como** DM, **quero** que o sistema me lembre de salving throws relevantes quando dano é aplicado **para que** eu não esqueça de nenhuma mecânica.

## Context

Beyond concentration (CP.2.2), there are other save-triggered effects:
- Death saves when HP reaches 0 (D&D 5e)
- Condition saves at start/end of turn (some conditions allow re-save)

## Acceptance Criteria

1. **Death Save prompt:**
   - When a PC (is_player=true) reaches 0 HP:
     - Show toast: "💀 [Name] is at 0 HP! Death Saves required."
     - Toggle is_defeated is NOT automatic for PCs (only for monsters)
     - Add "Dying" visual indicator to PC combatant row
   - When a monster reaches 0 HP:
     - Auto-mark as defeated (existing behavior)
     - Log to combat log

2. **Start-of-turn reminders:**
   - At turn start, check if active combatant has conditions with re-save opportunities
   - Show non-blocking reminder: "Aldric is Frightened — can repeat WIS save at end of turn"
   - This is informational only — no auto-rolling (conditions vary too much)

3. **Integrate with combat log (CP.2.1):**
   - Log all prompts that fire
   - Log death save results if DM uses the roll button

## Technical Notes

- Start-of-turn reminders fire in advanceTurn()
- Use toast/notification system, never modal (non-blocking)
- Keep it lightweight — don't try to automate all condition saves

## Tasks

- [ ] Death save prompt on PC reaching 0 HP
- [ ] "Dying" visual indicator for PCs at 0 HP (distinct from defeated)
- [ ] Start-of-turn condition reminders (informational toast)
- [ ] Log prompts to combat log
- [ ] i18n strings (pt-BR + en)
