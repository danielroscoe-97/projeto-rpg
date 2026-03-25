---
story_key: 3-3-initiative-entry-sorting-and-tiebreaker-resolution
epic: 3
story_id: 3.3
status: done
created: 2026-03-24
updated: 2026-03-24
---

# Story 3.3: Initiative Entry, Sorting & Tiebreaker Resolution

## Story

As a **DM**,
I want to enter initiative values for all combatants, have them auto-sorted, and manually resolve ties,
So that combat turn order is established quickly and accurately.

## Acceptance Criteria

- AC1: The session page shows an initiative input field for each combatant
- AC2: When the DM enters initiative values, combatants are automatically sorted in descending order
- AC3: Tied combatants (same initiative value) are visually indicated
- AC4: The DM can drag-and-drop tied combatants to manually reorder them (mouse and touch) (FR8)
- AC5: Reordered positions persist (stored in `initiative_order` field)
- AC6: When the DM clicks "Start Combat", the first combatant in initiative order is marked as the active turn
- AC7: The round number (starting at 1) is displayed on the session page

## Tasks / Subtasks

### Task 1: Create Initiative Utility Functions
- [ ] 1.1 Create `lib/utils/initiative.ts`:
  - `sortByInitiative(combatants)` — sorts descending by `initiative`, preserves `initiative_order` for ties
  - `detectTies(combatants)` — returns set of initiative values that appear more than once
  - `assignInitiativeOrder(combatants)` — assigns `initiative_order` 0..N after sort
- [ ] 1.2 Write unit tests for all three functions

### Task 2: Add Initiative State to Combat Store
- [ ] 2.1 Update `lib/stores/combat-store.ts`:
  - Add action `setInitiative(id, value)` — updates a combatant's initiative
  - Add action `reorderCombatants(newOrder: Combatant[])` — replaces combatant list with reordered array and re-assigns `initiative_order`
  - Add action `startCombat()` — sets `is_active = true`, assigns `current_turn_index = 0`
- [ ] 2.2 Add `startCombat` + `setInitiative` + `reorderCombatants` to `CombatActions` in `lib/types/combat.ts`
- [ ] 2.3 Write unit tests for the new actions

### Task 3: Create InitiativeTracker Component
- [ ] 3.1 Create `components/combat/InitiativeTracker.tsx` — renders each combatant with an initiative number input
- [ ] 3.2 On each input change, call `setInitiative` then re-sort the list immediately
- [ ] 3.3 Visually highlight tied combatants (e.g., amber border/badge)
- [ ] 3.4 Show "Start Combat" button — calls `startCombat()` and persists `initiative_order` to DB
- [ ] 3.5 Write integration tests: initiative input, auto-sort verification, tie detection, Start Combat enabled only when all initiatives set

### Task 4: Create TiebreakerDragList Component
- [ ] 4.1 Create `components/combat/TiebreakerDragList.tsx` using `@dnd-kit/core` + `@dnd-kit/sortable`
- [ ] 4.2 Only renders the tied combatants for a given initiative value
- [ ] 4.3 On drag end, updates the order in the combat store via `reorderCombatants`
- [ ] 4.4 Write tests: drag reorder calls reorderCombatants with new order

### Task 5: Integrate into Session Page
- [ ] 5.1 Update `app/app/session/[id]/page.tsx` — if `is_active = false`, render `<InitiativeTracker />`; if `is_active = true`, show combat view with round number
- [ ] 5.2 Persist initiative_order to DB (`combatants` table) when Start Combat is clicked
- [ ] 5.3 Persist `is_active = true` on the encounter record

## Dev Notes

### Sort Logic
- Sort combatants by `initiative` descending (highest goes first)
- For ties: sort stably — preserve current order within tie group
- `initiative_order` = array index after sort (0-based)

### DB Persistence (Start Combat)
```typescript
// Update each combatant's initiative_order
for (const combatant of sorted) {
  await supabase.from('combatants').update({
    initiative: combatant.initiative,
    initiative_order: combatant.initiative_order
  }).eq('id', combatant.id)
}
// Mark encounter as active
await supabase.from('encounters').update({ is_active: true }).eq('id', encounter_id)
```

### dnd-kit Setup
- `@dnd-kit/core` (DndContext, useDraggable, useDroppable, closestCenter) + `@dnd-kit/sortable` (SortableContext, useSortable, arrayMove)
- Touch support via PointerSensor (handles both mouse and touch)
- Accessibility: keyboard support built into dnd-kit sensors

### Component Architecture
- `InitiativeTracker` — list of combatants with initiative inputs + tie detection + Start Combat
- `TiebreakerDragList` — sub-component for drag-reordering a group of tied combatants
- Session page renders `InitiativeTracker` when encounter is not yet active

## Dev Agent Record

### Implementation Plan
_To be filled by dev agent_

### Debug Log
_To be filled by dev agent_

### Completion Notes
_To be filled by dev agent_

## File List

_To be filled by dev agent_

## Change Log

| Date | Change |
|------|--------|
| 2026-03-24 | Story created |
