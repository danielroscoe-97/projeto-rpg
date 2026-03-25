---
story_key: 8-8-qa-regression-e2e-validation
epic: 8
story_id: 8.8
status: ready-for-dev
created: 2026-03-24
updated: 2026-03-24
---

# Story 8.8: QA Regression & E2E Validation

## Story

As the **QA team**,
I want comprehensive regression testing of the refactored combat tracker,
So that all existing features work correctly in the new unified flow and no regressions are shipped.

## Acceptance Criteria

- AC1: All existing combat store unit tests pass (adapted to new Combatant shape with notes fields)
- AC2: The new unified setup flow is covered by integration tests (add inline, SRD search, campaign load, drag reorder)
- AC3: The combat transition (Start Combat) is tested: sort, persist, in-place transition, URL update
- AC4: All active combat features are regression-tested: damage/healing/temp HP, conditions, defeat, add/remove mid-combat, turn advancement, round tracking
- AC5: Real-time sync is tested: player board receives HP updates, turn advances, condition changes, reorder, player notes
- AC6: DM notes are verified as NOT broadcast to players
- AC7: Page reload resilience is tested: refresh in pre-combat (lost state acceptable), refresh in active combat (hydrate from DB)
- AC8: Edge cases are tested: empty encounter, all defeated, single combatant, duplicate monster names
- AC9: Drag reorder is tested in both pre-combat and active combat modes
- AC10: `next build` passes with zero errors
- AC11: All accessibility requirements maintained: ARIA labels, keyboard navigation, 44px tap targets, color + non-color indicators

## Test Plan

### Unit Tests (Jest)

#### Combat Store (`lib/stores/combat-store.test.ts`)
- [ ] All existing tests pass with updated Combatant fixtures (add `dm_notes: ''`, `player_notes: ''`)
- [ ] `updateDmNotes` — sets DM notes for a combatant
- [ ] `updatePlayerNotes` — sets player notes for a combatant
- [ ] `reorderCombatants` — universal reorder assigns `initiative_order` correctly
- [ ] `addCombatant` — new combatants have empty notes by default

#### Initiative Utils (`lib/utils/initiative.test.ts`)
- [ ] `sortByInitiative` — sorts descending, stable for equal values
- [ ] `assignInitiativeOrder` — assigns 0-based indices
- [ ] `detectTies` — still works (kept as utility even though TiebreakerDragList is removed)

### Component Tests (React Testing Library)

#### CombatantSetupRow
- [ ] Renders all fields: Init, Name, HP, AC, Notes, Remove
- [ ] Editing fields updates store
- [ ] Remove button removes combatant
- [ ] Tab order flows left-to-right

#### EncounterSetup
- [ ] Renders add-row, SRD search, campaign loader, start button
- [ ] Add via add-row: type fields + Enter → combatant added
- [ ] SRD search: select monster → add-row auto-filled
- [ ] Campaign load: players bulk-added
- [ ] Start Combat disabled when empty
- [ ] List in insertion order (not sorted)

#### CombatantRow (refactored)
- [ ] Compact card layout renders correctly
- [ ] Current turn: gold indicator + border
- [ ] Click-to-edit: click name → input → blur → saved
- [ ] Player notes visible and editable
- [ ] DM notes visible and editable
- [ ] Overflow menu: all actions accessible
- [ ] Defeated state: opacity + strikethrough
- [ ] HP bar colors: green/amber/red

#### Combat Transition
- [ ] Start Combat: sorts by initiative, persists, transitions in-place
- [ ] Store: `is_active` becomes true, `current_turn_index = 0`
- [ ] Failure: stays in pre-combat with error

### Integration / E2E Scenarios

#### Full Flow: Setup → Combat → End
- [ ] Add 3 combatants inline (2 monsters, 1 player)
- [ ] Set initiatives
- [ ] Drag reorder one combatant
- [ ] Start combat → verify sorted by initiative
- [ ] Advance turns → verify round increment on wrap
- [ ] Apply damage → verify HP bar updates
- [ ] Add condition → verify badge appears
- [ ] Defeat combatant → verify skipped on next turn
- [ ] Add combatant mid-combat → verify inserted correctly
- [ ] Edit notes (player + DM) → verify persistence
- [ ] End encounter → verify redirect to dashboard

#### Real-Time Sync
- [ ] DM applies damage → player board shows updated HP
- [ ] DM advances turn → player board shows new turn indicator
- [ ] DM adds condition → player board shows badge
- [ ] DM reorders → player board shows new order
- [ ] DM updates player notes → player board shows updated notes
- [ ] DM updates DM notes → player board does NOT show them

#### Page Reload
- [ ] Refresh during active combat → state hydrated from DB
- [ ] Refresh during pre-combat → state lost (acceptable, show empty setup)

#### Edge Cases
- [ ] Zero combatants → Start Combat disabled
- [ ] All combatants defeated → turn advance is no-op
- [ ] Single combatant → turn advance increments round
- [ ] Same monster added 3x → auto-numbered ("Goblin 1", "Goblin 2", "Goblin 3")
- [ ] Initiative not set for one combatant → Start Combat blocked with warning

### Build Verification
- [ ] `next build` passes with zero TypeScript errors
- [ ] No dead imports from deleted components
- [ ] Bundle size check: no significant regression

## Dev Notes

- Adapt existing test fixtures first (add notes fields) before writing new tests.
- Use `useCombatStore.getState()` pattern for store assertions (established pattern in existing tests).
- Mock Supabase with `jest.mock("@/lib/supabase/client")` (established pattern).
- For drag tests, use `@dnd-kit` test utilities or fire pointer events.
- The real-time sync tests may need to mock Supabase Realtime channels.
