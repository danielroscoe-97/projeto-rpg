# Story 2.2: Individual HP Within Group

Status: ready-for-dev

## Story

As a **DM**,
I want each monster in a group to maintain its own HP, temp HP, and defeated status independently,
so that I can damage, heal, and defeat monsters individually while keeping them organized as a group.

## Acceptance Criteria

1. Each group member has independent `current_hp`, `max_hp`, `temp_hp`, `is_defeated`.
2. HpAdjuster works per-individual within expanded group. Damage to Goblin 2 does not affect Goblin 1 or 3.
3. `combat:hp_update` broadcast sent per-individual (by combatant_id), not per-group.
4. Individual defeat: marking Goblin 2 as defeated shows defeat visual, others remain active. Header updates count: "Goblins (2/3 ativos)".
5. Auto-group-defeat: when ALL members defeated, group header shows full defeated visual. Group skipped in turn advance. Reviving 1 member reactivates group.
6. Aggregated HP in collapsed header: sum of current_hp / sum of max_hp for active members. Proportional HP bar.

## Tasks / Subtasks

- [ ] Task 1: Verify HP actions work per-combatant-id (AC: #1, #2)
  - [ ] In `lib/stores/combat-store.ts`: verify `applyDamage`, `applyHealing`, `setTempHp`, `setDefeated` operate by combatant ID (not group)
  - [ ] If any action operates on group, refactor to per-individual

- [ ] Task 2: Per-individual broadcast (AC: #3)
  - [ ] Verify `combat:hp_update` sends individual combatant_id
  - [ ] Verify `combat:defeated_change` sends individual combatant_id

- [ ] Task 3: Individual defeat visual (AC: #4)
  - [ ] In `CombatantRow.tsx`: defeated member shows opacity-50, strikethrough
  - [ ] Group header: update count "Goblins (2/3 ativos)" based on active members

- [ ] Task 4: Auto-group-defeat logic (AC: #5)
  - [ ] In combat-store: computed property `isGroupDefeated(groupId)` — true when all members `is_defeated`
  - [ ] Turn advance: skip group if all members defeated
  - [ ] Un-defeating one member reactivates group in turn order

- [ ] Task 5: Aggregated HP in header (AC: #6)
  - [ ] In `MonsterGroupHeader.tsx`: show `{sumCurrentHp}/{sumMaxHp} HP`
  - [ ] HP bar: proportional to sum ratio, color-coded (green/yellow/red)
  - [ ] Exclude defeated members from aggregation (or mark separately)

## Dev Notes

### Key Insight: No New Schema Needed
HP is already per-combatant in the existing schema. Each group member is its own row in `combatants` table with its own `current_hp`, `max_hp`, `temp_hp`. The grouping is purely UI — the HP system already works correctly.

### Files to Modify
- `components/combat/CombatantRow.tsx` — per-member HP display within group
- `components/combat/MonsterGroupHeader.tsx` — aggregated HP display
- `lib/stores/combat-store.ts` — `isGroupDefeated` computed, turn-skip logic
- `components/combat/HpAdjuster.tsx` — verify works per-individual (likely no change)

### Anti-Patterns
- **DON'T** apply damage to all group members at once — always per-individual
- **DON'T** broadcast HP updates per-group — always per-individual combatant_id
- **DON'T** permanently disband group when all defeated — reviving one should reactivate

### References
- [Source: _bmad-output/implementation-artifacts/v2-epics-0-1-2-stories.md — Story 2.2]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, FR45]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
