# Story 2.3: Expand/Collapse Monster Groups

Status: ready-for-dev

## Story

As a **DM**,
I want to expand and collapse monster groups in the combat list,
so that I can see a compact overview when managing many monsters, and expand a specific group when I need to interact with individual members.

## Acceptance Criteria

1. Default state: collapsed. Only group header "Goblins (3)" visible with ChevronRight icon.
2. Click chevron/header: expand group (150-200ms slide-down animation). ChevronRight → ChevronDown. Members show: name, HP bar, conditions, HpAdjuster.
3. Click again: collapse (150-200ms slide-up). ChevronDown → ChevronRight. Respects `prefers-reduced-motion`.
4. Collapsed header shows: chevron, monster name (plural) + count, aggregated HP bar, active/total count. If members have conditions, summary badge.
5. State stored in Zustand (`Map<string, boolean>` of group_id → isExpanded). Client-side ONLY — not persisted, not broadcast. Default collapsed on page reload.
6. Keyboard: Enter/Space toggles. ArrowRight expands (if collapsed), ArrowLeft collapses (if expanded). ArrowDown moves focus to first member when expanded. `aria-expanded` updated.
7. Edge case: group with 1 member remaining still shows header with expand/collapse.

## Tasks / Subtasks

- [ ] Task 1: Create MonsterGroupHeader component (AC: #1, #4)
  - [ ] Create `components/combat/MonsterGroupHeader.tsx`
  - [ ] Render: chevron, name + "(N)", aggregated HP bar, active count
  - [ ] Condition summary badge when members have conditions

- [ ] Task 2: Expand/collapse animation (AC: #2, #3)
  - [ ] Use Framer Motion `AnimatePresence` + `motion.div` with height transition 150-200ms
  - [ ] Chevron rotation animation (ChevronRight → ChevronDown)
  - [ ] `prefers-reduced-motion`: skip animation, instant toggle

- [ ] Task 3: Zustand state management (AC: #5)
  - [ ] In `lib/stores/combat-store.ts` or new slice: `expandedGroups: Map<string, boolean>`
  - [ ] Action: `toggleGroupExpanded(groupId: string)`
  - [ ] Client-side only — NOT persisted to DB, NOT broadcast

- [ ] Task 4: Combat list conditional rendering (AC: #2)
  - [ ] In combat list: if group collapsed, render only MonsterGroupHeader
  - [ ] If expanded, render header + individual CombatantRow for each member

- [ ] Task 5: Keyboard navigation (AC: #6)
  - [ ] `onKeyDown` on header: Enter/Space toggle, ArrowRight expand, ArrowLeft collapse
  - [ ] ArrowDown when expanded: focus first member
  - [ ] `aria-expanded={isExpanded}` on header element

- [ ] Task 6: Edge case: single member (AC: #7)
  - [ ] Group with 1 remaining member: still render as group with header
  - [ ] Count shows "(1)"

## Dev Notes

### Files to Create/Modify
- New: `components/combat/MonsterGroupHeader.tsx`
- Modify: `components/combat/CombatView.tsx` — conditional render based on expand state
- Modify: `lib/stores/combat-store.ts` — `expandedGroups` state + toggle action

### Animation Pattern
```typescript
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence>
  {isExpanded && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {members.map(m => <CombatantRow key={m.id} combatant={m} />)}
    </motion.div>
  )}
</AnimatePresence>
```

### Anti-Patterns
- **DON'T** persist expand/collapse state to DB — it's ephemeral
- **DON'T** broadcast expand/collapse to players — DM-only UI state
- **DON'T** auto-"ungroup" when 1 member remains

### References
- [Source: _bmad-output/implementation-artifacts/v2-epics-0-1-2-stories.md — Story 2.3]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, FR46]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — UX-DR18 MonsterGroupRow]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
