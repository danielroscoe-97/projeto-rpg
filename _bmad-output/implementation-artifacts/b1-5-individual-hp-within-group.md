# Story B.1.5: Individual HP Within Monster Group

Status: ready-for-dev

## Story

As a **DM**,
I want each monster in a group to have its own HP,
so that I can track damage individually while keeping them grouped for initiative.

## Acceptance Criteria

1. Each monster in a group has independent current_hp, max_hp, temp_hp
2. DM can apply damage/healing to specific monster in expanded group
3. HP bars use LIGHT/MODERATE/HEAVY/CRITICAL tiers (70/40/10% — immutable rule)
4. Defeating one monster doesn't affect others in group
5. Defeated monsters shown as struck-through in expanded view
6. Group header HP shows "3/5 alive" style indicator
7. Undo stack works per-monster, not per-group
8. Broadcast sends individual HP changes

## Tasks / Subtasks

- [ ] Task 1: Individual HP UI in expanded group (AC: #1, #2)
  - [ ] Each monster row has its own HP controls
- [ ] Task 2: HP bar tiers (AC: #3)
  - [ ] LIGHT (>70%), MODERATE (>40%), HEAVY (>10%), CRITICAL (<=10%)
- [ ] Task 3: Defeat handling (AC: #4, #5)
  - [ ] Individual defeat toggle per monster
  - [ ] Visual: struck-through name, dimmed row
- [ ] Task 4: Group header aggregate (AC: #6)
  - [ ] "3/5 alive" counter
- [ ] Task 5: Undo per-monster (AC: #7)
- [ ] Task 6: Broadcast (AC: #8)
- [ ] Task 7: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `components/combat/CombatantRow.tsx` — individual HP in group context
- Modify: `lib/stores/combat-store.ts` — per-monster HP operations
- Modify: `lib/hooks/useCombatActions.ts` — per-monster damage/healing
- Modify: `components/combat/MonsterGroupHeader.tsx` — alive count

### Dependencies

B.1.4

### Anti-Patterns

- **DON'T** share HP across group members
- **DON'T** change HP tier thresholds — they are IMMUTABLE (70/40/10%)
- **DON'T** auto-defeat group when one monster dies

### References

- [Source: _bmad-output/implementation-artifacts/v2-2-2-individual-hp-within-group.md — original spec]
- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — HP tiers immutable]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
