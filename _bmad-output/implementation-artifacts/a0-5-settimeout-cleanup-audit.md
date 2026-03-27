# Story A.0.5: Audit e Cleanup de setTimeout/setInterval

Status: ready-for-dev

## Story

As a **developer**,
I want all timers properly cleaned up on component unmount,
so that there are no memory leaks or orphaned callbacks.

## Acceptance Criteria

1. `CombatantRow.tsx` setTimeout for flash effect wrapped in useEffect with cleanup
2. `GuestBanner.tsx` setInterval cleared on unmount
3. `use-realtime-channel.ts` setTimeout for polling has cleanup in useEffect return
4. All other setTimeout/setInterval across components audited
5. No timer fires after component unmount (verified by React strict mode double-mount)

## Tasks / Subtasks

- [ ] Task 1: Fix CombatantRow.tsx flash timer (AC: #1)
- [ ] Task 2: Fix GuestBanner.tsx interval (AC: #2)
- [ ] Task 3: Fix use-realtime-channel.ts polling timer (AC: #3)
- [ ] Task 4: Audit all components for timer usage (AC: #4)
  - [ ] Grep for setTimeout, setInterval across components/
  - [ ] Fix any additional instances found
- [ ] Task 5: Verify with React strict mode (AC: #5)

## Dev Notes

### Files to Modify/Create

- Modify: `components/combat/CombatantRow.tsx` — wrap setTimeout in useEffect cleanup
- Modify: `components/guest/GuestBanner.tsx` — add clearInterval on unmount
- Modify: `lib/realtime/use-realtime-channel.ts` — add cleanup to polling setTimeout

### Anti-Patterns

- **DON'T** use refs to track timer IDs when useEffect cleanup suffices
- **DON'T** add isMounted flags — use useEffect return cleanup

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — DT-04]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
