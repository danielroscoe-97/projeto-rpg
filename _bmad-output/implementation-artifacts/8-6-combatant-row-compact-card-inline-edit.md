---
story_key: 8-6-combatant-row-compact-card-inline-edit
epic: 8
story_id: 8.6
status: ready-for-dev
created: 2026-03-24
updated: 2026-03-24
---

# Story 8.6: CombatantRow Refactor — Compact Card + Inline Edit + Dual Notes

## Story

As a **DM**,
I want each combatant in active combat to be displayed as a compact card with click-to-edit fields, visible notes (player + DM), and a clean overflow menu for secondary actions,
So that I can manage combat quickly without opening separate editors.

## Acceptance Criteria

- AC1: Given an active combat combatant, then it renders as a compact card:
  `[DragHandle] [▶] [Init] [Name] [HP/Max ████] [AC] [Dmg] [Heal] [···]`
  with a subtle second line: `📝 player notes | 🔒 dm notes | Conditions: badges`
- AC2: Given the current turn combatant, then the row has a gold `▶` indicator and gold left-border
- AC3: Given any text/number field (Name, HP, AC, Init), when clicked, then it transforms into an inline `<input>` — saves on blur or Enter, cancels on Escape
- AC4: Given the player notes field (`📝`), when clicked, then it becomes an inline text input — visible to players
- AC5: Given the DM notes field (`🔒`), when clicked, then it becomes an inline text input — DM-only, NOT broadcast
- AC6: Given the `[Dmg]` button, when clicked, then the HpAdjuster opens inline for damage mode
- AC7: Given the `[Heal]` button, when clicked, then the HpAdjuster opens inline for healing mode
- AC8: Given the `[···]` overflow menu, when clicked, then a dropdown shows: Temp HP, Conditions, Defeat/Un-defeat, Edit Spell DC, Remove, Version Switch (for monsters)
- AC9: Given a defeated combatant, then the row shows reduced opacity, strikethrough name, and a "Defeated" badge
- AC10: Given the HP bar, then it follows existing color rules: green > 50%, amber 25-50%, red < 25%
- AC11: Given conditions on a combatant, then they render as compact colored badges on the second line
- AC12: Given an SRD monster, when the name is clicked, then the stat block accordion expands inline (existing behavior preserved)
- AC13: Given the player board (PlayerInitiativeBoard), then it shows `player_notes` but NOT `dm_notes`

## Tasks / Subtasks

### Task 1: Refactor CombatantRow Layout
- [ ] 1.1 Restructure `components/combat/CombatantRow.tsx` into two-line compact card layout
- [ ] 1.2 Line 1: drag handle, turn indicator, init value, name, HP bar + numbers, AC, action buttons
- [ ] 1.3 Line 2: player notes (📝), DM notes (🔒), condition badges
- [ ] 1.4 Line 2 only visible if there are notes or conditions (collapse when empty)

### Task 2: Click-to-Edit Fields
- [ ] 2.1 Create a reusable `InlineEditField` component (or pattern) — displays text, transforms to input on click
- [ ] 2.2 Apply to: Name, HP (current_hp), AC
- [ ] 2.3 On blur / Enter: save to store + persist to DB + broadcast
- [ ] 2.4 On Escape: revert to original value

### Task 3: Dual Notes Display & Edit
- [ ] 3.1 Player notes (📝): shown with a subtle icon, click-to-edit, calls `updatePlayerNotes()` + `persistPlayerNotes()` + broadcast
- [ ] 3.2 DM notes (🔒): shown with lock icon, click-to-edit, calls `updateDmNotes()` + `persistDmNotes()` — NO broadcast
- [ ] 3.3 If both notes are empty, show a subtle "+ Add notes" placeholder

### Task 4: Action Buttons Refactor
- [ ] 4.1 `[Dmg]` and `[Heal]` buttons — primary, always visible, open HpAdjuster inline
- [ ] 4.2 `[···]` overflow menu using Radix `DropdownMenu`:
  - Temp HP (opens number input)
  - Conditions (opens ConditionSelector)
  - Defeat / Un-defeat toggle
  - Edit Spell Save DC (inline input)
  - Remove from combat
  - Switch Version (for SRD monsters only)
- [ ] 4.3 Reuse existing handler functions from CombatSessionClient

### Task 5: Visual Polish (Action Color Semantics — see UX Design Spec)
- [ ] 5.1 Current turn: gold `▶` glyph + `border-l-2 border-gold` + subtle gold background tint
- [ ] 5.2 Defeated: `opacity-50`, `line-through` on name, "Defeated" badge
- [ ] 5.3 HP bar: thin bar below HP numbers, color-coded (green/amber/red)
- [ ] 5.4 Condition badges: compact, colored (reuse existing color scheme from ConditionSelector)
- [ ] 5.5 Overflow menu: dark dropdown matching theme
- [ ] 5.6 **Defeat toggle**: red subtle (`bg-red-900/20 text-red-400`) when marking defeated; green subtle (`bg-emerald-900/30 text-emerald-400`) when reviving
- [ ] 5.7 **Remove button**: red subtle (`bg-red-900/20 text-red-400`) — never neutral
- [ ] 5.8 **Panel toggle buttons** (HP, Conditions, Edit): neutral (`bg-white/[0.06]`), gold when active (`bg-gold text-surface-primary`)
- [ ] 5.9 **HP Adjuster Apply button**: contextual — red for Damage, green for Heal, purple for Temp HP

### Task 6: Player Board Update
- [ ] 6.1 Update `PlayerInitiativeBoard.tsx` to display `player_notes` for each combatant
- [ ] 6.2 Listen for `combat:player_notes_update` broadcast events
- [ ] 6.3 Ensure `dm_notes` is NEVER sent to or displayed on the player board

### Task 7: Tests
- [ ] 7.1 Render test: compact card layout with all elements
- [ ] 7.2 Click-to-edit test: click name → input appears → type → blur → saved
- [ ] 7.3 Notes test: player notes visible, DM notes visible, both editable
- [ ] 7.4 Overflow menu test: all actions accessible
- [ ] 7.5 Defeated state test: visual changes applied
- [ ] 7.6 Player board test: shows player_notes, no dm_notes

## Dev Notes

- The `CombatantRow` is the most complex component. Refactor carefully — the existing test suite should guide what NOT to break.
- The `InlineEditField` pattern: render a `<span>` by default, on click replace with `<input>` that auto-focuses. Save on blur/Enter. This is a common pattern — keep it as a shared utility or inline hook.
- The overflow `[···]` menu consolidates actions that are currently scattered. This is a pure UX improvement — no new logic needed, just reorganization.
- Player board: the existing `PlayerInitiativeBoard` receives combatant data via broadcast. Just add `player_notes` to the broadcast payload and render it.
