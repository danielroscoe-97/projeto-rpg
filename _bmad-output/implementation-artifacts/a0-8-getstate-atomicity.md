# Story A.0.8: Garantir Atomicidade de getState() no useCombatActions

Status: ready-for-dev

## Story

As a **developer**,
I want combat action handlers to read state atomically,
so that interleaved realtime events can't cause inconsistent mutations.

## Acceptance Criteria

1. Each action handler in `useCombatActions.ts` reads state ONCE at the start
2. All derived values computed from that single snapshot
3. No multiple `getState()` calls within the same handler
4. Store mutations use `set()` with updater function (not spread from stale snapshot)
5. Existing behavior preserved — no visible changes to DM or player
6. Tests added for race condition scenarios

## Tasks / Subtasks

- [ ] Task 1: Refactor advanceTurn handler (AC: #1, #2, #3)
  - [ ] Single getState() call, derive all values
- [ ] Task 2: Refactor handleApplyDamage (AC: #1, #3)
- [ ] Task 3: Refactor handleApplyHealing (AC: #1, #3)
- [ ] Task 4: Refactor handleToggleCondition (AC: #1, #3)
- [ ] Task 5: Refactor handleRemoveCombatant (AC: #1, #3)
- [ ] Task 6: Ensure set() uses updater pattern (AC: #4)
- [ ] Task 7: Add tests (AC: #6)

## Dev Notes

### Files to Modify/Create

- Modify: `lib/hooks/useCombatActions.ts` — refactor all handlers
- Modify: `lib/stores/combat-store.ts` — ensure set() updater pattern
- New or Modify: test file for useCombatActions

### Anti-Patterns

- **DON'T** use getState() → mutate → getState() pattern
- **DON'T** spread entire state object — use Zustand's `set(state => ({...}))` updater
- **DON'T** change external behavior — this is internal refactor only

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — DT-05]
- [Source: _bmad-output/planning-artifacts/architecture.md — State Management]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
