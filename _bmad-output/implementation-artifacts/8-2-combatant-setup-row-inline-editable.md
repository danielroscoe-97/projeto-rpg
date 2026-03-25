---
story_key: 8-2-combatant-setup-row-inline-editable
epic: 8
story_id: 8.2
status: ready-for-dev
created: 2026-03-24
updated: 2026-03-24
---

# Story 8.2: CombatantSetupRow — Inline Editable Spreadsheet Row

## Story

As a **DM**,
I want to see each combatant as an inline editable row with Init, Name, HP, AC, and Notes fields,
So that I can rapidly build an encounter by tabbing through fields like a spreadsheet.

## Acceptance Criteria

- AC1: Given the pre-combat view, when a combatant exists, then it's rendered as a single row with: drag handle, Init input, Name input, HP input, AC input, Notes input, Remove button
- AC2: Given a combatant row, when the DM tabs between fields, then focus moves left-to-right: Init → Name → HP → AC → Notes
- AC3: Given any input field, when the DM changes the value, then the combat store is updated immediately (controlled inputs)
- AC4: Given the Init field, when a number is entered, then it accepts values from -5 to 30
- AC5: Given the HP field, when edited, then both `current_hp` and `max_hp` are updated (pre-combat, they're always equal)
- AC6: Given the Name field, when edited, then the combatant's name is updated in the store
- AC7: Given the Remove button (✕), when clicked, then the combatant is removed from the store
- AC8: Given the drag handle, when grabbed and dragged, then the row is draggable (actual drag logic in Story 8.4)
- AC9: Given a player combatant, then a subtle "player" badge is shown next to the name
- AC10: Given a SRD monster combatant, then a version badge (2014/2024) is shown next to the name

## Tasks / Subtasks

### Task 1: Create CombatantSetupRow Component
- [ ] 1.1 Create `components/combat/CombatantSetupRow.tsx`
- [ ] 1.2 Layout: flex row with fixed-width columns — `[DragHandle 24px] [Init 60px] [Name flex-1] [HP 70px] [AC 60px] [Notes flex-1] [Remove 32px]`
- [ ] 1.3 All fields are `<input>` elements with appropriate types (number for Init/HP/AC, text for Name/Notes)
- [ ] 1.4 Tab index flows naturally left-to-right

### Task 2: Wire Store Integration
- [ ] 2.1 Init field → calls `setInitiative(id, value)` on change
- [ ] 2.2 Name field → calls `updateCombatantStats(id, { name })` on change
- [ ] 2.3 HP field → calls `updateCombatantStats(id, { max_hp, current_hp })` on change (both equal pre-combat)
- [ ] 2.4 AC field → calls `updateCombatantStats(id, { ac })` on change
- [ ] 2.5 Notes field → calls `updatePlayerNotes(id, notes)` on change (pre-combat notes default to player-visible)
- [ ] 2.6 Remove → calls `removeCombatant(id)`

### Task 3: Visual Polish
- [ ] 3.1 Drag handle: `⠿` or grip dots icon, `cursor-grab`
- [ ] 3.2 Subtle row border `border-border`, hover state `bg-white/[0.02]`
- [ ] 3.3 Player badge: small "Player" text in muted color
- [ ] 3.4 Version badge: reuse `VersionBadge` component from `RulesetSelector`
- [ ] 3.5 Input styling: minimal borders, transparent background, focus ring on focus
- [ ] 3.6 Remove button: red subtle (`text-red-400 hover:text-red-400`) per Action Color Semantics — never use gold or green for destructive actions

### Task 4: Tests
- [ ] 4.1 Render test: all fields visible with correct values
- [ ] 4.2 Edit test: changing Init/Name/HP/AC/Notes updates store
- [ ] 4.3 Remove test: clicking ✕ removes combatant
- [ ] 4.4 Tab order test: focus flows through fields correctly

## Dev Notes

- This component is ONLY for pre-combat mode. Active combat uses the existing `CombatantRow` (refactored in Story 8.6).
- Pre-combat: notes input maps to `player_notes`. DM notes are a combat-mode feature only (shown in the overflow menu during active combat).
- The drag handle renders a grip icon but doesn't wire up `@dnd-kit` — that's Story 8.4's responsibility. The component just needs to accept a `dragHandleProps` or ref.
- Keep the component lightweight — no HP bars, no conditions, no stat blocks. Pure spreadsheet row.
