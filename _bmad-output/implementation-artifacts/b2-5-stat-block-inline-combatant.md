# Story B.2.5: Stat Block Inline no Combatant

Status: ready-for-dev

## Story

As a **DM**,
I want to quickly view a monster's full stat block directly from the combat tracker,
so that I don't need to switch to the compendium mid-combat.

## Acceptance Criteria

1. Each NPC combatant row has a "View Stats" icon button
2. Clicking opens an inline expandable panel below the combatant row
3. Panel shows full monster stat block (same format as compendium)
4. Stat block respects ruleset version (2014 vs 2024) of current session
5. Panel uses Framer Motion height animation
6. Only one stat block expanded at a time (accordion with groups)
7. Player view does NOT have this option
8. Keyboard accessible (Tab to button, Enter to expand)

## Tasks / Subtasks

- [ ] Task 1: Add "View Stats" button to CombatantRow (AC: #1, #7)
  - [ ] Only for NPCs, only in DM view
- [ ] Task 2: Inline stat block panel (AC: #2, #3)
  - [ ] Reuse MonsterStatBlock component from oracle
  - [ ] Pass monster data from SRD cache
- [ ] Task 3: Ruleset version (AC: #4)
  - [ ] Read session ruleset, pass to stat block
- [ ] Task 4: Animation (AC: #5)
  - [ ] Framer Motion AnimatePresence for height
- [ ] Task 5: Accordion behavior (AC: #6)
- [ ] Task 6: Accessibility (AC: #8)
- [ ] Task 7: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `components/combat/CombatantRow.tsx` — add stats button + expandable panel
- Modify: `components/oracle/MonsterStatBlock.tsx` — ensure reusable outside oracle context

### Anti-Patterns

- **DON'T** fetch stats from server — use client-side SRD cache
- **DON'T** show stats to players
- **DON'T** duplicate stat block rendering code

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — JN-09]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
