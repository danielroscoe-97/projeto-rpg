# Story CP.1.6: Advantage/Disadvantage UX Polish

Status: ready-for-dev

## Story

**Como** DM, **quero** que vantagem e desvantagem sejam intuitivos e visíveis **para que** eu não esqueça de usar os modificadores de teclado.

## Context

ClickableRoll already supports Shift=advantage, Ctrl=disadvantage. But:
- No visual indicator that these modifiers exist
- No persistent advantage/disadvantage toggle (must hold Shift/Ctrl every click)
- MonsterActionBar needs consistent behavior

## Acceptance Criteria

1. **Persistent mode toggle** on MonsterActionBar:
   - Three-state toggle button: Normal / Advantage / Disadvantage
   - Click to cycle: Normal → Advantage → Disadvantage → Normal
   - Visual:
     - Normal: no highlight
     - Advantage: green glow + "ADV" label
     - Disadvantage: red glow + "DIS" label
   - While active: ALL attack rolls from action bar use that mode
   - Resets to Normal when turn advances (new combatant)
   - Still respects Shift/Ctrl as override (Shift during Disadvantage = Normal)

2. **Tooltip reminder** on all clickable rolls:
   - On hover, show brief tooltip: "Shift: Advantage | Ctrl: Disadvantage"
   - Only show first 3 times per session (then hide, stored in sessionStorage)
   - Small and non-intrusive

3. **Roll result display** shows which mode was used:
   - Advantage: show both dice, highlight the kept one in green, strikethrough the discarded
   - Disadvantage: same but highlight kept in red
   - Already partially implemented in ClickableRoll — ensure consistency with MonsterActionBar

4. **Keyboard shortcut in combat view:**
   - Press "A" to toggle advantage mode for current combatant
   - Press "S" to toggle disadvantage mode
   - Add to KeyboardCheatsheet

## Tasks

- [ ] Add advantage/disadvantage toggle state to MonsterActionBar
- [ ] Three-state cycle button (Normal/ADV/DIS) with visual indicators
- [ ] Auto-reset on turn advance
- [ ] Shift/Ctrl override logic
- [ ] Tooltip on clickable rolls (first 3 times only)
- [ ] Consistent roll display (both dice, highlight/strikethrough)
- [ ] Keyboard shortcuts A (advantage) and S (disadvantage)
- [ ] Update KeyboardCheatsheet with new shortcuts
- [ ] i18n strings (pt-BR + en)
