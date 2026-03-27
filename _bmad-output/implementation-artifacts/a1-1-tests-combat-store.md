# Story A.1.1: Testes para Combat Store (Grouping, Undo, Conditions)

Status: ready-for-dev

## Story

As a **developer**,
I want comprehensive tests for the combat store,
so that refactoring and new features don't introduce regressions.

## Acceptance Criteria

1. Test coverage for `combat-store.ts` reaches 80%+
2. Tests cover: addCombatant, removeCombatant, updateHP, applyDamage, applyHealing
3. Tests cover: advanceTurn, resetEncounter, toggleCondition
4. Tests cover: undo stack (push, pop, multiple levels)
5. Tests cover: monster grouping (add to group, remove from group, group initiative)
6. Tests cover: temporary HP interaction with damage
7. Tests cover: defeat toggle and its interaction with turn order
8. All tests pass with `npx jest --testPathPattern combat-store`

## Tasks / Subtasks

- [ ] Task 1: Test addCombatant scenarios (AC: #2)
  - [ ] Add PC, add NPC, add with existing initiative
  - [ ] Add mid-combat (if supported)
- [ ] Task 2: Test HP management (AC: #2, #6)
  - [ ] Apply damage (normal, overkill, with temp HP)
  - [ ] Apply healing (normal, overheal)
  - [ ] Temporary HP shield behavior
- [ ] Task 3: Test initiative & turn (AC: #3, #7)
  - [ ] advanceTurn wraps around
  - [ ] Defeated combatants skipped
  - [ ] Tiebreaker by DEX
- [ ] Task 4: Test undo stack (AC: #4)
  - [ ] Single undo, multiple undo, undo at empty stack
- [ ] Task 5: Test monster grouping (AC: #5)
  - [ ] Create group, add to group, remove from group
  - [ ] Group initiative roll
  - [ ] Individual HP within group
- [ ] Task 6: Test conditions (AC: #3)
  - [ ] Toggle on/off, multiple conditions
- [ ] Task 7: Verify coverage (AC: #1, #8)

## Dev Notes

### Files to Modify/Create

- Modify: `lib/stores/combat-store.test.ts` — expand significantly

### Context

`lib/stores/combat-store.ts` is the most critical store — handles initiative, HP, conditions, undo stack, and monster grouping. Current test file `combat-store.test.ts` exists but coverage is minimal.

### Dependencies

Track A.0 should be complete (especially A.0.8 getState atomicity)

### Anti-Patterns

- **DON'T** test implementation details — test behavior/outcomes
- **DON'T** mock the store internals — test through public API
- **DON'T** use snapshot tests for store state — use explicit assertions

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — Test Coverage]
- [Source: _bmad-output/planning-artifacts/architecture.md — State Management]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
