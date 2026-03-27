# Story B.1.6: Expand/Collapse Monster Groups

Status: ready-for-dev

## Story

As a **DM**,
I want to expand and collapse monster groups with smooth animation,
so that I can focus on the group I'm managing.

## Acceptance Criteria

1. Click on group header toggles expand/collapse
2. Framer Motion animation: slide down on expand, slide up on collapse
3. Expanded state stored in combat store (expandedGroups)
4. Only one group expanded at a time (accordion behavior) — configurable
5. Keyboard accessible (Enter/Space to toggle)
6. Player view always collapsed (no expand option)

## Tasks / Subtasks

- [ ] Task 1: Toggle behavior (AC: #1, #3)
- [ ] Task 2: Animation (AC: #2)
  - [ ] Framer Motion AnimatePresence + layout animation
- [ ] Task 3: Accordion mode (AC: #4)
- [ ] Task 4: Accessibility (AC: #5)
  - [ ] aria-expanded, role="button", keyboard handlers
- [ ] Task 5: Player restriction (AC: #6)

## Dev Notes

### Files to Modify/Create

- Modify: `components/combat/MonsterGroupHeader.tsx` — toggle + animation
- Modify: `lib/stores/combat-store.ts` — expandedGroups toggle with accordion option

### Dependencies

B.1.4

### Anti-Patterns

- **DON'T** use CSS transitions — use Framer Motion for consistency
- **DON'T** let players expand groups

### References

- [Source: _bmad-output/implementation-artifacts/v2-2-3-expand-collapse-groups.md — original spec]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
