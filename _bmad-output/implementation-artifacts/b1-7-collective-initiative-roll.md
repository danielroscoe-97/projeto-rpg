# Story B.1.7: Collective Initiative Roll for Monster Groups

Status: ready-for-dev

## Story

As a **DM**,
I want to roll initiative once for a monster group,
so that all grouped monsters share the same initiative value.

## Acceptance Criteria

1. When rolling initiative for a group, one roll applies to all members
2. DM can input or auto-roll (1d20 + DEX modifier)
3. All group members update their initiative value simultaneously
4. Tiebreaker with non-group combatants uses group's DEX modifier
5. DM can override individual initiative within group if needed
6. Initiative change broadcasts to all players

## Tasks / Subtasks

- [ ] Task 1: Group initiative roll logic (AC: #1, #2)
  - [ ] Single roll propagated to all group members
- [ ] Task 2: Store update (AC: #3)
  - [ ] Batch update all combatants in group
- [ ] Task 3: Tiebreaker (AC: #4)
  - [ ] Use first member's DEX as group DEX
- [ ] Task 4: Override option (AC: #5)
  - [ ] DM can click individual to set different value
- [ ] Task 5: Broadcast (AC: #6)
- [ ] Task 6: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `lib/hooks/useInitiativeRolling.ts` — group roll logic
- Modify: `lib/stores/combat-store.ts` — batch initiative update
- Modify: `components/combat/MonsterGroupHeader.tsx` — roll button

### Dependencies

B.1.4

### Anti-Patterns

- **DON'T** roll separately for each monster in group by default
- **DON'T** prevent DM from overriding individual values

### References

- [Source: _bmad-output/implementation-artifacts/v2-2-4-collective-initiative-roll.md — original spec]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
