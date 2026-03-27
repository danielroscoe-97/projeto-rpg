# Story 2.4: Collective Initiative Roll for Monster Groups

Status: ready-for-dev

## Story

As a **DM**,
I want a monster group to roll a single initiative value that applies to all members,
so that grouped monsters act on the same turn (as D&D 5e rules suggest for identical monsters), speeding up combat setup.

## Acceptance Criteria

1. During setup: "Roll All NPCs" or per-group roll button rolls ONE d20 + DEX mod per group. Result applied to ALL members. 3 groups = 3 rolls, not 6+ individual rolls.
2. Initiative editable in group header — value applied to all members simultaneously.
3. DM can override individual member's initiative manually. Overridden member keeps group_id but may appear at different position in initiative order.
4. Group header shows initiative value ("Init: 14"). If members have mixed initiative (override), show range or most common value.
5. DiceHistoryPanel: one entry per group roll ("Goblins (grupo): d20+1 = 14"), not duplicated per member.
6. "Reset group" option re-syncs all members to header value, clearing individual overrides.

## Tasks / Subtasks

- [ ] Task 1: Collective roll logic (AC: #1)
  - [ ] In `lib/utils/initiative.ts`: add `rollGroupInitiative(group: Combatant[], dexMod: number): number`
  - [ ] Single d20 + dexMod
  - [ ] Apply result to all combatants in group

- [ ] Task 2: "Roll All NPCs" group awareness (AC: #1)
  - [ ] In `lib/hooks/useInitiativeRolling.ts` or equivalent:
  - [ ] `handleRollAllNpcs`: group combatants by `monster_group_id`
  - [ ] For each group: 1 roll, apply to all members
  - [ ] For ungrouped NPCs: 1 roll each (V1 behavior)

- [ ] Task 3: Group header initiative field (AC: #2, #6)
  - [ ] In `MonsterGroupHeader.tsx`: show editable initiative field
  - [ ] Editing applies to ALL members (except individually overridden)
  - [ ] "Reset grupo" button: re-syncs all to header value

- [ ] Task 4: Individual override (AC: #3, #4)
  - [ ] DM edits individual member's initiative → overrides group value
  - [ ] Member keeps `monster_group_id` (stays in group for UI/HP)
  - [ ] Header shows initiative with indicator if mixed

- [ ] Task 5: DiceHistoryPanel integration (AC: #5)
  - [ ] Register single entry: "Goblins (grupo): d20+{mod} = {result}"
  - [ ] NOT one entry per member

- [ ] Task 6: Zustand store actions (AC: #1, #2, #3)
  - [ ] `setGroupInitiative(groupId: string, value: number)` — apply to all members
  - [ ] `setIndividualInitiative(combatantId: string, value: number)` — override single

## Dev Notes

### Files to Modify
- `lib/utils/initiative.ts` — collective roll function
- `lib/hooks/useInitiativeRolling.ts` — group-aware roll logic
- `components/combat/MonsterGroupHeader.tsx` — initiative display + edit
- `components/combat/EncounterSetup.tsx` — group initiative in setup
- `lib/stores/combat-store.ts` — `setGroupInitiative`, `setIndividualInitiative`

### D&D 5e Rule Reference
> "The DM makes one initiative roll for an entire group of identical creatures, so each member of the group acts at the same time." — PHB p.189

### Anti-Patterns
- **DON'T** roll individual initiatives for grouped monsters — defeats the purpose
- **DON'T** remove member from group when initiative is individually overridden
- **DON'T** duplicate DiceHistoryPanel entries per member — one per group

### References
- [Source: _bmad-output/implementation-artifacts/v2-epics-0-1-2-stories.md — Story 2.4]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, FR44]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
