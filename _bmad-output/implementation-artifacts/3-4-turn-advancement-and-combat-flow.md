---
story_key: 3-4-turn-advancement-and-combat-flow
epic: 3
story_id: 3.4
status: done
created: 2026-03-24
updated: 2026-03-24
---

# Story 3.4: Turn Advancement & Combat Flow

## Story

As a **DM**,
I want to advance turns through the initiative order,
So that combat flows smoothly without manual tracking.

## Acceptance Criteria

- AC1: A "Next Turn" button is visible during active combat
- AC2: Clicking "Next Turn" moves the active turn indicator to the next combatant in initiative order
- AC3: Defeated combatants (is_defeated=true) are skipped automatically during turn advancement
- AC4: When the last non-defeated combatant's turn ends, the round counter increments and the turn returns to the first non-defeated combatant
- AC5: The active combatant is visually highlighted (red border + active indicator) — uses CombatantRow's existing `isCurrentTurn` prop
- AC6: The round number is displayed and updates reactively (from Zustand store, not from server prop)
- AC7: Turn state (current_turn_index, round_number) is persisted to DB after each advance (background, optimistic)
- AC8: On page reload, active combat resumes with correct turn and round (server hydration is correct)

## Tasks / Subtasks

### Task 1: Add `advanceTurn` and `hydrateActiveState` to types

- [ ] 1.1 In `lib/types/combat.ts`, add to `CombatActions`:
  ```typescript
  /** Advance to the next non-defeated combatant, incrementing round_number if the list wraps. No-op if all defeated. */
  advanceTurn: () => void;
  /** Hydrate active combat state from server (called on page load when is_active=true). */
  hydrateActiveState: (currentTurnIndex: number, roundNumber: number) => void;
  ```

### Task 2: Implement actions in combat store

- [ ] 2.1 In `lib/stores/combat-store.ts`, implement `advanceTurn`:
  ```typescript
  advanceTurn: () =>
    set((state) => {
      const { combatants, current_turn_index, round_number } = state;
      if (combatants.length === 0) return state;
      let next = current_turn_index;
      let roundBumped = false;
      for (let i = 0; i < combatants.length; i++) {
        next = (next + 1) % combatants.length;
        if (next === 0) roundBumped = true;
        if (!combatants[next].is_defeated) break;
      }
      if (combatants[next].is_defeated) return state; // all defeated — no-op
      return {
        current_turn_index: next,
        round_number: roundBumped ? round_number + 1 : round_number,
      };
    }),
  ```
- [ ] 2.2 Implement `hydrateActiveState`:
  ```typescript
  hydrateActiveState: (currentTurnIndex, roundNumber) =>
    set({ is_active: true, current_turn_index: currentTurnIndex, round_number: roundNumber }),
  ```

### Task 3: Add DB persistence helper

- [ ] 3.1 In `lib/supabase/session.ts`, add:
  ```typescript
  /** Persists current_turn_index and round_number after a turn advance. */
  export async function persistTurnAdvance(
    encounterId: string,
    currentTurnIndex: number,
    roundNumber: number
  ): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("encounters")
      .update({ current_turn_index: currentTurnIndex, round_number: roundNumber })
      .eq("id", encounterId);
    if (error) throw new Error(error.message);
  }
  ```

### Task 4: Fix session page to pass currentTurnIndex

- [ ] 4.1 In `app/app/session/[id]/page.tsx`, add `currentTurnIndex` prop to `CombatSessionClient`:
  ```tsx
  <CombatSessionClient
    sessionId={sessionId}
    encounterId={encounter.id}
    initialCombatants={combatants}
    isActive={encounter.is_active ?? false}
    roundNumber={encounter.round_number ?? 1}
    currentTurnIndex={encounter.current_turn_index ?? 0}  // ADD THIS
  />
  ```
  The session page already fetches `current_turn_index` in the `select()` query — it just wasn't being passed down.

### Task 5: Refactor CombatSessionClient — fix hydration + add Next Turn

- [ ] 5.1 Add `currentTurnIndex: number` to `CombatSessionClientProps`
- [ ] 5.2 Fix hydration: on page load with `isActive=true`, call `hydrateActiveState(currentTurnIndex, roundNumber)` instead of `startCombat()` (which resets index to 0):
  ```typescript
  useEffect(() => {
    const store = useCombatStore.getState();
    store.clearEncounter();
    store.setEncounterId(encounterId, sessionId);
    store.hydrateCombatants(initialCombatants);
    if (isActive) {
      store.hydrateActiveState(currentTurnIndex, roundNumber); // preserves server state
    }
  }, [encounterId, sessionId, isActive, initialCombatants, currentTurnIndex, roundNumber]);
  ```
- [ ] 5.3 Read `round_number` and `current_turn_index` from store (not from props) for reactive updates:
  ```typescript
  const round_number = useCombatStore((s) => s.round_number);
  const current_turn_index = useCombatStore((s) => s.current_turn_index);
  ```
- [ ] 5.4 Replace the active combat view's inline combatant rendering with `<CombatantRow>` (the component already exists at `components/combat/CombatantRow.tsx` with all required features: turn indicator, HP bar, conditions, stat block expansion, defeated badge):
  ```tsx
  import { CombatantRow } from "@/components/combat/CombatantRow";
  // ...
  <ul role="list" aria-label="Initiative order" data-testid="initiative-list" className="space-y-2">
    {combatants.map((c, index) => (
      <CombatantRow key={c.id} combatant={c} isCurrentTurn={index === current_turn_index} />
    ))}
  </ul>
  ```
- [ ] 5.5 Add `handleAdvanceTurn` handler with optimistic store update + background DB persist:
  ```typescript
  const handleAdvanceTurn = async () => {
    advanceTurn(); // optimistic — instant UI update
    const { encounter_id, current_turn_index: nextIdx, round_number: nextRound } =
      useCombatStore.getState();
    if (!encounter_id) return;
    try {
      await persistTurnAdvance(encounter_id, nextIdx, nextRound);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save turn.");
    }
  };
  ```
- [ ] 5.6 Add "Next Turn" button in the active combat header:
  ```tsx
  <button
    onClick={handleAdvanceTurn}
    className="px-4 py-2 bg-[#e94560] text-white font-medium rounded-md hover:bg-[#c73652] transition-colors text-sm"
    data-testid="next-turn-btn"
  >
    Next Turn →
  </button>
  ```
- [ ] 5.7 Remove the placeholder text: `"Turn advancement and HP controls coming in Story 3.4."`

### Task 6: Write tests

- [ ] 6.1 In `lib/stores/combat-store.test.ts`, add `describe("useCombatStore – advanceTurn")`:
  - advances `current_turn_index` by 1
  - wraps around from last to first and increments `round_number`
  - skips `is_defeated=true` combatants
  - is a no-op when all combatants are defeated
  - `hydrateActiveState` sets `is_active=true`, `current_turn_index`, `round_number`
- [ ] 6.2 In `components/session/CombatSessionClient.test.tsx` (create if not exists):
  - "Next Turn" button is visible in active combat view
  - clicking "Next Turn" calls `advanceTurn` on the store
  - `persistTurnAdvance` is called after advancing
  - on load with `isActive=true`, store reflects server's `currentTurnIndex` (not 0)
  - `CombatantRow` is rendered for each combatant with correct `isCurrentTurn` prop

## Dev Notes

### Architecture Alignment

- **Store pattern:** Actions live in `lib/stores/combat-store.ts`, types in `lib/types/combat.ts`. Follow the `verb + noun` naming convention: `advanceTurn`, `hydrateActiveState`. See existing: `startCombat`, `setInitiative`, `reorderCombatants`.
- **DB persistence:** Only `lib/supabase/session.ts` functions are called from client components — never call `createClient()` directly in components. Pattern: `persistInitiativeAndStartCombat` (already in `session.ts`) for reference.
- **Optimistic UI (NFR8):** Store update FIRST (instant visual), then DB persist async. On error: call `setError()`.
- **Component ownership:** `components/combat/` handles all combat UI. `CombatantRow` is the canonical combatant row — do NOT create a new one or inline the rendering again in `CombatSessionClient`.
- **No direct Supabase calls in components:** All DB ops go through `lib/supabase/session.ts` functions.

### Critical Bug Fix Required (Hydration)

The current `CombatSessionClient.useEffect` calls `startCombat()` when `isActive=true`. `startCombat()` sets `current_turn_index = 0` — this resets the turn on every page reload. Story 3-4 must fix this by using `hydrateActiveState(currentTurnIndex, roundNumber)` instead.

Additionally, `currentTurnIndex` is fetched on the session page (`encounter.current_turn_index`) but never passed to `CombatSessionClient` — this prop is missing. Add it in `app/app/session/[id]/page.tsx`.

### CombatantRow Integration

`CombatantRow` (at `components/combat/CombatantRow.tsx`) is already implemented with:
- `isCurrentTurn` prop → red border + active indicator dot
- HP bar with color states (green/amber/red)
- Temp HP display
- Condition badges with color mapping
- Stat block expansion (one-tap tier) for monsters
- `is_defeated` → `opacity-50` + "Defeated" badge
- All correct `data-testid` attributes

The active combat view in `CombatSessionClient` currently has its own inline rendering that partially duplicates `CombatantRow`. Replace it entirely with `<CombatantRow>` — the component is already designed for exactly this use case.

### Round Increment Logic

```
Round increments ONLY when next === 0 (we crossed back to start of list).
i.e., when the logical "wrap" happens past the last combatant in the list.
```

The `advanceTurn` algorithm:
1. Loop up to `combatants.length` times (guard against infinite loop if all defeated)
2. Each iteration: `next = (next + 1) % total`. If `next === 0`, set `roundBumped = true`
3. Stop at first non-defeated combatant
4. If the final `next` is still defeated → all defeated → return unchanged state

Edge cases:
- Single non-defeated combatant: advance → same index, round++ (loops to itself)
- All defeated: no-op (don't change index or round)
- Defeated combatants at the start of the list: skipped, possibly triggering roundBumped

### Test Patterns

Tests follow the project's Jest + jsdom + @testing-library/react setup. Co-located `.test.ts` / `.test.tsx` files. Import test utilities from `@testing-library/react` and `@testing-library/user-event`. Mock Supabase client using `jest.mock("@/lib/supabase/client")`.

Reference pattern for store tests (from `lib/stores/combat-store.test.ts`):
```typescript
beforeEach(() => useCombatStore.getState().clearEncounter());
// call actions directly: useCombatStore.getState().advanceTurn()
// assert state: useCombatStore.getState().current_turn_index
```

## Dev Agent Record

### Implementation Plan
_To be filled by dev agent_

### Debug Log
_To be filled by dev agent_

### Completion Notes
_To be filled by dev agent_

## File List

Files to **modify**:
- `lib/types/combat.ts` — add `advanceTurn` and `hydrateActiveState` to `CombatActions`
- `lib/stores/combat-store.ts` — implement `advanceTurn` and `hydrateActiveState`
- `lib/supabase/session.ts` — add `persistTurnAdvance` function
- `app/app/session/[id]/page.tsx` — pass `currentTurnIndex` prop to `CombatSessionClient`
- `components/session/CombatSessionClient.tsx` — fix hydration, add Next Turn button, use `CombatantRow`
- `lib/stores/combat-store.test.ts` — add `advanceTurn` and `hydrateActiveState` tests

Files to **create**:
- `components/session/CombatSessionClient.test.tsx` — integration tests for Next Turn flow

Files to **NOT touch**:
- `components/combat/CombatantRow.tsx` — already complete, just consume it
- `components/combat/InitiativeTracker.tsx` — unchanged
- `lib/utils/initiative.ts` — unchanged

## Change Log

| Date | Change |
|------|--------|
| 2026-03-24 | Story created |
