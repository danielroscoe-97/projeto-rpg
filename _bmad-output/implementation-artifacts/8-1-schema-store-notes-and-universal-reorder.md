---
story_key: 8-1-schema-store-notes-and-universal-reorder
epic: 8
story_id: 8.1
status: ready-for-dev
created: 2026-03-24
updated: 2026-03-24
---

# Story 8.1: Schema & Store — Dual Notes Fields + Universal Reorder Foundation

## Story

As a **DM**,
I want combatants to have separate DM-only and player-visible notes fields,
So that I can track private tactical info (e.g., "secretly cursed") alongside public info (e.g., "concentrating on Bless") that players can see.

## Acceptance Criteria

- AC1: Given the combatants table, when a migration is applied, then two new columns exist: `dm_notes TEXT DEFAULT ''` and `player_notes TEXT DEFAULT ''`
- AC2: Given the Combatant TypeScript interface, when inspected, then it includes `dm_notes: string` and `player_notes: string`
- AC3: Given the combat store, when `updateDmNotes(id, notes)` is called, then the combatant's `dm_notes` is updated
- AC4: Given the combat store, when `updatePlayerNotes(id, notes)` is called, then the combatant's `player_notes` is updated
- AC5: Given a notes change, when persisted, then `persistDmNotes` and `persistPlayerNotes` save to the correct DB column
- AC6: Given a notes change, when broadcast, then `combat:dm_notes_update` is DM-only (not broadcast to player channel) and `combat:player_notes_update` is broadcast to all
- AC7: Given the store's `reorderCombatants()`, when called with any reordered array, then `initiative_order` is reassigned for all combatants (universal, not tie-specific)
- AC8: Given a page reload, when the store is hydrated from DB, then both `dm_notes` and `player_notes` are restored correctly
- AC9: All existing combat store tests pass with the new fields (notes default to `''` in all existing test fixtures)

## Tasks / Subtasks

### Task 1: Database Migration
- [ ] 1.1 Create `supabase/migrations/008_combatant_notes.sql`:
  ```sql
  ALTER TABLE combatants ADD COLUMN dm_notes TEXT NOT NULL DEFAULT '';
  ALTER TABLE combatants ADD COLUMN player_notes TEXT NOT NULL DEFAULT '';
  ```
- [ ] 1.2 Verify migration applies cleanly against existing schema

### Task 2: Update TypeScript Types
- [ ] 2.1 `lib/types/combat.ts` — Add `dm_notes: string` and `player_notes: string` to `Combatant` interface
- [ ] 2.2 `lib/types/combat.ts` — Add `updateDmNotes` and `updatePlayerNotes` to `CombatActions` interface
- [ ] 2.3 `lib/types/database.ts` — Update any DB row types to include the new columns

### Task 3: Update Combat Store
- [ ] 3.1 `lib/stores/combat-store.ts` — Add `dm_notes: ''` and `player_notes: ''` to default combatant in `addCombatant`
- [ ] 3.2 Implement `updateDmNotes(id: string, notes: string)` action
- [ ] 3.3 Implement `updatePlayerNotes(id: string, notes: string)` action
- [ ] 3.4 Ensure `hydrateCombatants` maps `dm_notes` and `player_notes` from DB rows
- [ ] 3.5 Ensure `reorderCombatants` works universally (no tie-detection dependency)

### Task 4: Persistence Functions
- [ ] 4.1 `lib/supabase/session.ts` — Add `persistDmNotes(combatantId: string, notes: string)`
- [ ] 4.2 `lib/supabase/session.ts` — Add `persistPlayerNotes(combatantId: string, notes: string)`
- [ ] 4.3 Update `persistNewCombatant` to include both notes fields

### Task 5: Broadcast Events
- [ ] 5.1 `lib/types/realtime.ts` — Add `combat:player_notes_update` event type (broadcast to all)
- [ ] 5.2 Note: `dm_notes` updates are NOT broadcast — DM-only data, persisted directly
- [ ] 5.3 `lib/realtime/broadcast.ts` — Add helper for player notes broadcast

### Task 6: Tests
- [ ] 6.1 Update all existing combat store test fixtures to include `dm_notes: ''` and `player_notes: ''`
- [ ] 6.2 Add unit tests for `updateDmNotes` and `updatePlayerNotes` actions
- [ ] 6.3 Add unit test verifying `reorderCombatants` works for any arbitrary reorder (not just ties)
- [ ] 6.4 Ensure all existing tests pass without modification beyond fixture updates

## Dev Notes

- The `dm_notes` field is NEVER broadcast via realtime — it's private to the DM. Only persisted to DB directly.
- The `player_notes` field IS broadcast so the PlayerInitiativeBoard can show it.
- The `reorderCombatants` action already exists and works correctly — this story just verifies it's not coupled to tie-detection logic from `TiebreakerDragList`.
- Default both notes to `''` (empty string), not `null`, to avoid null-checks everywhere.
