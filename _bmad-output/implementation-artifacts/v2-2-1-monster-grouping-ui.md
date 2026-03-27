# Story 2.1: Monster Grouping UI

Status: ready-for-dev

## Story

As a **DM**,
I want to add multiple monsters of the same type as a named group with a single action,
so that adding 5 Goblins takes one action instead of five, and they appear as a cohesive group in the initiative list.

## Acceptance Criteria

1. Migration 012 adds `monster_group_id UUID NULL` and `group_order INTEGER NULL` to `combatants`. Composite index on `(encounter_id, monster_group_id)`. (Shared migration with Story 1.2 display_name.)
2. "Quantity" field (stepper: - [N] +, default: 1, range: 1-20) appears in MonsterSearchPanel when monster selected. i18n: `combat.monster_quantity`.
3. Quantity > 1: N combatants created with same `monster_group_id` (UUID generated client-side), `group_order` 1..N, names "Goblin 1"..."Goblin N", same HP/AC/stats from SRD.
4. Quantity = 1: single combatant with `monster_group_id = null`, `group_order = null` (V1 behavior).
5. Group header rendered: "Goblins (3)" with chevron icon. Group occupies correct initiative position.
6. Adding same monster again when group exists: prompt "Add to existing group" or "Create new group".
7. `Combatant` interface updated with `monster_group_id: string | null` and `group_order: number | null`.

## Tasks / Subtasks

- [ ] Task 1: Migration 012 (AC: #1) — NOTE: migration shared with Story 1.2. If already created, verify columns exist.
  - [ ] Add `monster_group_id UUID NULL DEFAULT NULL` to combatants
  - [ ] Add `group_order INTEGER NULL DEFAULT NULL` to combatants
  - [ ] Create index: `CREATE INDEX idx_combatants_group ON combatants(encounter_id, monster_group_id)`

- [ ] Task 2: Quantity field in MonsterSearchPanel (AC: #2)
  - [ ] In `components/combat/MonsterSearchPanel.tsx`, add stepper when monster selected
  - [ ] Stepper: min=1, max=20, default=1
  - [ ] Label: i18n key `combat.monster_quantity`

- [ ] Task 3: Group creation logic in store (AC: #3, #4)
  - [ ] In `lib/stores/combat-store.ts`, add `addMonsterGroup` action:
    ```typescript
    addMonsterGroup: (monster: SrdMonster, quantity: number) => {
      if (quantity === 1) {
        // V1 behavior — no group
        addCombatant({ ...monster, monster_group_id: null, group_order: null });
        return;
      }
      const groupId = crypto.randomUUID();
      for (let i = 1; i <= quantity; i++) {
        addCombatant({
          ...monster,
          name: `${monster.name} ${i}`,
          monster_group_id: groupId,
          group_order: i,
          initiative: null, // rolled collectively in Story 2.4
        });
      }
    }
    ```

- [ ] Task 4: Group header rendering (AC: #5)
  - [ ] Create `components/combat/MonsterGroupHeader.tsx`
  - [ ] Header shows: chevron icon, plural monster name + count "(3)", aggregated HP
  - [ ] Header occupies group's initiative position in combat list
  - [ ] Individual members shown below when expanded (expand/collapse in Story 2.3)

- [ ] Task 5: Add to existing group prompt (AC: #6)
  - [ ] When adding same monster type and a group already exists:
  - [ ] Show dialog: "Adicionar ao grupo existente" / "Criar novo grupo"
  - [ ] If adding to existing: new combatants get same `monster_group_id`, `group_order` continues

- [ ] Task 6: Update types (AC: #7)
  - [ ] In `lib/types/combat.ts`: add `monster_group_id: string | null`, `group_order: number | null`

## Dev Notes

### Files to Modify/Create
- New: `components/combat/MonsterGroupHeader.tsx`
- Modify: `components/combat/MonsterSearchPanel.tsx` (quantity stepper)
- Modify: `components/combat/EncounterSetup.tsx` (render group headers)
- Modify: `lib/stores/combat-store.ts` (`addMonsterGroup` action)
- Modify: `lib/types/combat.ts` (Combatant interface)
- Modify: `lib/utils/initiative.ts` (group support in sorting)

### Anti-Patterns
- **DON'T** create a group when quantity is 1 — preserve V1 behavior
- **DON'T** set initiative per-member at creation — groups roll collectively (Story 2.4)
- **DON'T** generate group_id server-side — use `crypto.randomUUID()` client-side for immediate use

### References
- [Source: _bmad-output/implementation-artifacts/v2-epics-0-1-2-stories.md — Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — V2.2 Schema combatants columns]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, FR44]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
