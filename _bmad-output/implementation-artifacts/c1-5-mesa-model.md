# Story C.1.5: Mesa Model — DM Pro Destrava Mesa Inteira

Status: ready-for-dev

## Story

As a **DM with Pro**,
I want my subscription to unlock Pro features for all players at my table,
so that the whole group benefits.

## Acceptance Criteria

1. When DM has Pro/Mesa subscription, all players in session get Pro features
2. Pro features unlocked dynamically via session → DM subscription check
3. Players see "Pro (via Mestre)" indicator
4. When DM downgrades, players lose Pro in next session
5. Feature flags check session context, not just user subscription
6. Migration `019_mesa_model.sql` properly integrated

## Tasks / Subtasks

- [ ] Task 1: Session-level feature check (AC: #1, #2, #5)
  - [ ] Feature gate checks: user plan OR session DM plan
- [ ] Task 2: Player Pro indicator (AC: #3)
- [ ] Task 3: Downgrade handling (AC: #4)
- [ ] Task 4: Migration integration (AC: #6)
- [ ] Task 5: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `lib/feature-flags.ts` — session context check
- Modify: `lib/hooks/use-feature-gate.ts` — accept session context
- Modify: `components/player/PlayerInitiativeBoard.tsx` — Pro indicator

### Anti-Patterns

- **DON'T** cache mesa model status per-player — always derive from DM subscription
- **DON'T** require players to have accounts for mesa model to work

### References

- [Source: _bmad-output/implementation-artifacts/v2-5-5-mesa-model.md]
- Dependencies: C.1.3

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
