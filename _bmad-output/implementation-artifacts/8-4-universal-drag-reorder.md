---
story_key: 8-4-universal-drag-reorder
epic: 8
story_id: 8.4
status: ready-for-dev
created: 2026-03-24
updated: 2026-03-24
---

# Story 8.4: Universal Drag Reorder with @dnd-kit

## Story

As a **DM**,
I want to drag any combatant row to reorder it freely — both during setup and active combat,
So that I have full control over initiative order without being limited to tie-resolution only.

## Acceptance Criteria

- AC1: Given the pre-combat list (EncounterSetup), when the DM drags a row by its handle, then the row moves to the new position and the list reorders
- AC2: Given the active combat list, when the DM drags a row by its handle, then the row moves and `initiative_order` is reassigned for all combatants
- AC3: Given a drag reorder in active combat, when completed, then the new order is persisted via `persistInitiativeOrder()` and broadcast via `combat:initiative_reorder`
- AC4: Given a drag in pre-combat, when completed, then the list order is updated in the store (no DB persist — encounter doesn't exist yet)
- AC5: Given the drag interaction, when a row is being dragged, then a visual drag overlay shows the row being moved
- AC6: Given touch devices, when the DM long-presses a drag handle, then drag behavior activates (touch support)
- AC7: Given the `TiebreakerDragList` component, when this story is complete, then it is no longer used anywhere and can be deleted
- AC8: Given the current turn indicator during active combat, when rows are reordered, then `current_turn_index` is updated to follow the combatant who was active (not the position)

## Tasks / Subtasks

### Task 1: DndContext Wrapper Component
- [ ] 1.1 Create `components/combat/SortableCombatantList.tsx` — wraps children with `DndContext` + `SortableContext`
- [ ] 1.2 Configure sensors: `PointerSensor` (mouse) + `TouchSensor` (with activation constraint for long-press)
- [ ] 1.3 `onDragEnd` handler: computes new order from `arrayMove`, calls `reorderCombatants(newOrder)`
- [ ] 1.4 `DragOverlay` for visual feedback during drag

### Task 2: Make CombatantSetupRow Sortable
- [ ] 2.1 Wrap each `CombatantSetupRow` with `useSortable` hook
- [ ] 2.2 Pass drag handle attributes to the grip icon element
- [ ] 2.3 Apply transform/transition styles from `useSortable`

### Task 3: Make CombatantRow Sortable (Active Combat)
- [ ] 3.1 Add drag handle to `CombatantRow` (subtle grip icon on the left)
- [ ] 3.2 Wrap with `useSortable` hook
- [ ] 3.3 On drag end in active combat: persist `initiative_order` + broadcast reorder event

### Task 4: Current Turn Index Tracking on Reorder
- [ ] 4.1 When reordering during active combat, find the combatant who was at `current_turn_index` before drag
- [ ] 4.2 After reorder, set `current_turn_index` to the new position of that combatant
- [ ] 4.3 Persist the updated `current_turn_index` to encounters table

### Task 5: Remove TiebreakerDragList
- [ ] 5.1 Delete `components/combat/TiebreakerDragList.tsx`
- [ ] 5.2 Remove all imports/references to `TiebreakerDragList`
- [ ] 5.3 Remove `detectTies` usage from `InitiativeTracker` (will be removed in Story 8.7 anyway)
- [ ] 5.4 Keep `detectTies` utility in `initiative.ts` for now (might be useful for warnings)

### Task 6: Tests
- [ ] 6.1 Test: drag reorder in pre-combat updates store order
- [ ] 6.2 Test: drag reorder in active combat reassigns `initiative_order`
- [ ] 6.3 Test: `current_turn_index` follows active combatant after reorder
- [ ] 6.4 Test: drag works with `@dnd-kit` test utilities

## Dev Notes

- `@dnd-kit/core` and `@dnd-kit/sortable` are already installed (used by `TiebreakerDragList`).
- `arrayMove` from `@dnd-kit/sortable` handles the reorder computation.
- The `SortableCombatantList` wrapper is reused by both `EncounterSetup` (pre-combat) and `CombatSessionClient` (active combat).
- For active combat reorder: the drag handle should be visually subtle (left edge grip dots) so it doesn't compete with the action buttons.
- Touch support: use `TouchSensor` with `activationConstraint: { delay: 250, tolerance: 5 }` to prevent accidental drags while scrolling.
