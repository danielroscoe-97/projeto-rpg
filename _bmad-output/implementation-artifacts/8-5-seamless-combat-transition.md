---
story_key: 8-5-seamless-combat-transition
epic: 8
story_id: 8.5
status: ready-for-dev
created: 2026-03-24
updated: 2026-03-24
---

# Story 8.5: Seamless Combat Transition — Start Combat In-Place

## Story

As a **DM**,
I want to click "Start Combat" and have the encounter list sort by initiative and transform into active combat mode on the same page — without any navigation or page reload,
So that the transition from setup to combat is instant and I never lose context.

## Acceptance Criteria

- AC1: Given the pre-combat view with combatants, when "Start Combat" is clicked, then combatants are sorted by initiative (descending) and `initiative_order` is assigned
- AC2: Given the sort, when combatants have equal initiative, then their relative order (from drag reorder or insertion) is preserved (stable sort)
- AC3: Given the sorted list, when persisted, then `createEncounterWithCombatants()` is called with initiative values already set — a single DB round-trip creates session + encounter + combatants with initiative
- AC4: Given successful persist, when the encounter is created, then the Zustand store transitions: `is_active = true`, `current_turn_index = 0`, `round_number = 1`
- AC5: Given the transition, when the store becomes active, then the same page re-renders from `EncounterSetup` to the active combat view (CombatantRows with actions) — NO page navigation
- AC6: Given the transition, when complete, then the URL updates to `/app/session/[id]` via `router.replace()` (browser history stays clean)
- AC7: Given the URL update, when the DM refreshes the page, then the active combat state is hydrated from the DB correctly (existing behavior)
- AC8: Given a persist failure (Supabase error), when "Start Combat" fails, then the view stays in pre-combat mode with an error message — no data is lost
- AC9: Given successful combat start, when the session is created, then the Supabase realtime channel is initialized for player sync
- AC10: Given a combatant with no initiative set (null), when "Start Combat" is clicked, then it is blocked — "All combatants need initiative values" warning shown
- AC11: Given the "Start Combat" button, when clicked, then it shows a loading state ("Starting…") and is disabled to prevent double-clicks

## Tasks / Subtasks

### Task 1: Sort & Assign Initiative Order
- [ ] 1.1 On "Start Combat" click: validate all combatants have `initiative !== null`
- [ ] 1.2 Sort combatants by `initiative` descending using `sortByInitiative()` from `lib/utils/initiative.ts`
- [ ] 1.3 Assign `initiative_order` using `assignInitiativeOrder()`
- [ ] 1.4 Update store with sorted order via `hydrateCombatants(sorted)`

### Task 2: Persist Encounter
- [ ] 2.1 Call `createEncounterWithCombatants(sortedCombatants, rulesetVersion)` — this creates session + encounter + all combatants in one call
- [ ] 2.2 The function already inserts initiative values if present — verify it persists `initiative` and `initiative_order`
- [ ] 2.3 On success: store `encounter_id` and `session_id` via `setEncounterId()`
- [ ] 2.4 Also persist `dm_notes` and `player_notes` for each combatant

### Task 3: In-Place Transition
- [ ] 3.1 Call `startCombat()` in store → sets `is_active = true`, `current_turn_index = 0`
- [ ] 3.2 The parent component (`CombatSessionClient` or new unified page) conditionally renders `EncounterSetup` when `!is_active` and the active combat view when `is_active`
- [ ] 3.3 NO `router.push()` — use `router.replace()` to update URL without navigation
- [ ] 3.4 The page component must handle both states (no pre-combat separate route)

### Task 4: Realtime Channel Init
- [ ] 4.1 After `setEncounterId()`, initialize the DM broadcast channel for `session:{sessionId}`
- [ ] 4.2 ShareSessionButton becomes available with the new session ID

### Task 5: Error Handling
- [ ] 5.1 Wrap persist in try/catch
- [ ] 5.2 On error: set error message in store, stay in pre-combat mode
- [ ] 5.3 Show error as a red alert below the "Start Combat" button
- [ ] 5.4 Clear error when DM makes any change

### Task 6: Page Component Refactor
- [ ] 6.1 Create or refactor the unified page at `/app/session/[id]/page.tsx` to handle:
  - Fresh encounter (no DB data yet, pre-combat mode)
  - Existing encounter from DB (hydrate and resume)
- [ ] 6.2 Create a new entry point route for fresh encounters (e.g., `/app/session/new` renders the same component but without DB hydration)
- [ ] 6.3 Dashboard "New Combat Session" CTA → navigates to fresh encounter page

### Task 7: Tests
- [ ] 7.1 Test: "Start Combat" sorts combatants by initiative descending
- [ ] 7.2 Test: persist creates encounter with initiative values
- [ ] 7.3 Test: store transitions to `is_active = true` on success
- [ ] 7.4 Test: persist failure keeps pre-combat mode with error
- [ ] 7.5 Test: null initiative blocks start with validation error
- [ ] 7.6 Test: URL updates to `/app/session/[id]` after start

## Dev Notes

- The current `createEncounterWithCombatants()` in `lib/supabase/encounter.ts` already supports inserting combatants with initiative values — we just need to ensure it persists `initiative`, `initiative_order`, `dm_notes`, and `player_notes`.
- The URL update via `router.replace()` is important for reload resilience — after start, refreshing loads from DB via the `[id]` route.
- The unified page component handles two entry paths: (a) fresh via `/app/session/new` → no DB data, pre-combat mode; (b) existing via `/app/session/[id]` → hydrate from DB.
- This is the **riskiest story** because it changes the persist timing. Test thoroughly.
