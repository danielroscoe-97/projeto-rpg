# Story B.1.4: Monster Grouping UI

Status: ready-for-dev

## Story

As a **DM**,
I want to group multiple identical monsters under one initiative entry,
so that managing 5 goblins doesn't clutter the tracker with 5 separate rows.

## Context

`MonsterGroupHeader.tsx` exists but isn't integrated. Types have `monster_group_id` and `group_order`. Store has `expandedGroups`. Migration `019_combatants_v2.sql` adds DB columns. Needs: full integration into EncounterSetup and CombatantRow.

## Acceptance Criteria

1. During encounter setup, DM can group monsters by selecting multiple and clicking "Group"
2. Grouped monsters appear as a single row with count badge (e.g., "Goblins x5")
3. Group shares one initiative roll
4. DM can expand group to see individual monsters
5. Each individual monster within group has its own HP (see B.1.5)
6. Group header shows aggregate status (all healthy, some damaged, all defeated)
7. Removing last monster from group auto-dissolves the group
8. Broadcast handles group events
9. Player view shows group as single entry (collapsed)

## Tasks / Subtasks

- [ ] Task 1: Integrate MonsterGroupHeader into initiative list (AC: #2, #3)
  - [ ] Replace individual rows with group header when grouped
- [ ] Task 2: Group creation UI (AC: #1)
  - [ ] Multi-select in EncounterSetup
  - [ ] "Group Selected" button
  - [ ] Auto-assign monster_group_id and group_order
- [ ] Task 3: Expand/collapse (AC: #4)
  - [ ] Use expandedGroups from store
  - [ ] Animate with Framer Motion
- [ ] Task 4: Group aggregate status (AC: #6)
  - [ ] Count healthy/damaged/defeated in group
  - [ ] Show status indicator on header
- [ ] Task 5: Group dissolution (AC: #7)
- [ ] Task 6: Broadcast integration (AC: #8)
- [ ] Task 7: Player view (AC: #9)
- [ ] Task 8: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `components/combat/MonsterGroupHeader.tsx` — complete implementation
- Modify: `components/combat/EncounterSetup.tsx` — group creation UI
- Modify: `components/combat/CombatantRow.tsx` — hide when in expanded group
- Modify: `lib/stores/combat-store.ts` — group operations
- Modify: `components/player/PlayerInitiativeBoard.tsx` — collapsed group view
- Modify: `messages/en.json`, `messages/pt-BR.json`

### Dependencies

Track A

### Anti-Patterns

- **DON'T** force grouping — individual monsters should always work
- **DON'T** share HP across group — each monster is independent (B.1.5)
- **DON'T** show individual monster names in player collapsed view

### References

- [Source: _bmad-output/implementation-artifacts/v2-2-1-monster-grouping-ui.md — original spec]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
