# Story B.1.1: Completar Add Combatant Mid-Combat

Status: ready-for-dev

## Story

As a **DM**,
I want to add new combatants during an active combat encounter,
so that I can introduce reinforcements or forgotten monsters without restarting.

## Context

Partial implementation exists. `AddCombatantForm.tsx` and store methods exist but lack: broadcast integration, proper initiative insertion, and tests. Previous spec: `v2-1-1-add-combatant-mid-combat.md`.

## Acceptance Criteria

1. DM can open "Add Combatant" panel during active combat without interrupting current turn
2. New combatant is inserted into initiative order based on their initiative roll
3. If initiative ties with existing combatant, tiebreaker by DEX applies
4. Broadcast event `combat:combatant_added` sent to all players immediately
5. Players see the new combatant appear in their initiative board in real-time
6. New combatant persisted to database (Supabase `combatants` table)
7. Undo stack supports removing the added combatant
8. Display name (anti-metagaming) respected for new combatants from creation
9. i18n keys for all new UI strings (pt-BR and en)

## Tasks / Subtasks

- [ ] Task 1: Verify existing store methods (AC: #2, #3)
  - [ ] Read combat-store.ts addCombatant method
  - [ ] Ensure initiative insertion respects sort order + DEX tiebreaker
- [ ] Task 2: Complete broadcast integration (AC: #4, #5)
  - [ ] Add `combat:combatant_added` event type to realtime types
  - [ ] Broadcast on add with sanitized combatant data
  - [ ] Player-side handler to insert into local store
- [ ] Task 3: Database persistence (AC: #6)
  - [ ] Supabase insert on add
  - [ ] Handle error with rollback
- [ ] Task 4: Undo support (AC: #7)
  - [ ] Push undo entry for add
  - [ ] Undo removes combatant + broadcast removal
- [ ] Task 5: Display name integration (AC: #8)
  - [ ] AddCombatantForm includes display_name field
  - [ ] Default display_name from monster name for NPCs
- [ ] Task 6: i18n (AC: #9)
  - [ ] Add keys to messages/en.json and messages/pt-BR.json
- [ ] Task 7: Tests (AC: all)
  - [ ] Store test: add mid-combat, initiative ordering
  - [ ] Component test: form submission, validation

## Dev Notes

### Files to Modify/Create

- Modify: `components/combat/AddCombatantForm.tsx` — add display_name, broadcast
- Modify: `lib/stores/combat-store.ts` — verify addCombatant, add undo
- Modify: `lib/hooks/useCombatActions.ts` — add handler with broadcast + persist
- Modify: `lib/types/realtime.ts` — add combatant_added event
- Modify: `lib/realtime/broadcast.ts` — handle new event type
- Modify: `components/player/PlayerInitiativeBoard.tsx` — handle combatant_added
- Modify: `messages/en.json`, `messages/pt-BR.json` — new keys

### Dependencies

Track A complete

### Anti-Patterns

- **DON'T** pause or reset combat to add combatant
- **DON'T** add combatant without initiative value
- **DON'T** broadcast real monster name to players — always use display_name
- **DON'T** skip undo support

### References

- [Source: _bmad-output/implementation-artifacts/v2-1-1-add-combatant-mid-combat.md — original spec]
- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — FQ-06]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
