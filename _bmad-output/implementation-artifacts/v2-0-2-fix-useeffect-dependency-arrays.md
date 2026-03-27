# Story 0.2: Fix useEffect Dependency Arrays

Status: review

## Story

As a **developer**,
I want to fix all useEffect hooks that suppress `react-hooks/exhaustive-deps`,
so that effects react correctly to dependency changes, preventing stale closures and unpredictable re-renders.

## Acceptance Criteria

1. **GuestCombatClient.tsx:76** — useEffect has complete dependency array without eslint-disable. Only `combatants` is in deps (useState setters are stable by React guarantee).
2. **DiceHistoryPanel.tsx:41** — useEffect has complete dependency array. `markRead` is stabilized via useCallback or useRef to prevent infinite re-renders.
3. **EncounterSetup.tsx:89** — useEffect has complete dependency array. Same pattern as GuestCombatClient (setters stable, only `combatants` needed).
4. **MonsterSearchPanel.tsx:140** — useEffect has complete dependency array. Load functions stabilized via useCallback. No duplicate requests on rulesetVersion change.
5. Zero `eslint-disable-next-line react-hooks/exhaustive-deps` comments remain in these 4 files.
6. `next build` passes with no ESLint warnings in affected files.

## Tasks / Subtasks

- [x] Task 1: Fix GuestCombatClient.tsx useEffect deps (AC: #1, #5)
  - [x] Read `components/guest/GuestCombatClient.tsx` and understand the useEffect at line 76
  - [x] Verify that `setSubmitError` and `setInvalidInitIds` are useState setters (stable, don't need to be in deps)
  - [x] Set dependency array to `[combatants]` only
  - [x] Remove `// eslint-disable-next-line react-hooks/exhaustive-deps`
  - [x] Verify no infinite re-render loop

- [x] Task 2: Fix DiceHistoryPanel.tsx useEffect deps (AC: #2, #5)
  - [x] Read `components/dice/DiceHistoryPanel.tsx` and understand the useEffect at line 41
  - [x] Identify where `markRead` is defined — from Zustand store `useDiceHistoryStore()`
  - [x] Used Option B: useRef pattern (markRead from Zustand without selector may recreate reference)
  - [x] Remove `// eslint-disable-next-line react-hooks/exhaustive-deps`

- [x] Task 3: Fix EncounterSetup.tsx useEffect deps (AC: #3, #5)
  - [x] Read `components/combat/EncounterSetup.tsx` and understand the useEffect at line 89
  - [x] Verify same pattern as GuestCombatClient (clears submitError/invalidInitIds when combatants change)
  - [x] Set dependency array to `[combatants]` only (setters are stable)
  - [x] Remove `// eslint-disable-next-line react-hooks/exhaustive-deps`

- [x] Task 4: Fix MonsterSearchPanel.tsx useEffect deps (AC: #4, #5)
  - [x] Read `components/combat/MonsterSearchPanel.tsx` and understand the useEffect at line 140
  - [x] Identified dependencies: `rulesetVersion` + `t` (from useTranslations, stable per locale)
  - [x] `loadMonsters`, `buildMonsterIndex` are module-level imports (already stable)
  - [x] Added `t` to deps array: `[rulesetVersion, t]`
  - [x] Remove `// eslint-disable-next-line react-hooks/exhaustive-deps`

- [x] Task 5: Verification (AC: #5, #6)
  - [x] `grep -rn "eslint-disable.*exhaustive-deps"` in the 4 files — zero results
  - [x] Run `next build` — passes clean

## Dev Notes

### Key React Principle

**useState setters are stable by React guarantee.** They never change between renders:
```typescript
const [error, setError] = useState(null);
// setError does NOT need to be in useEffect dependency arrays
useEffect(() => {
  setError(null); // safe — setError is always the same function
}, [combatants]); // only combatants needed
```

### Pattern: Stabilizing Callback Props with useRef

When a callback prop (like `markRead`) changes every render and causes infinite loops:

```typescript
// BEFORE (causes infinite loop):
useEffect(() => {
  if (isOpen) markRead();
}, [isOpen, markRead]); // markRead changes every render!

// AFTER (stable):
const markReadRef = useRef(markRead);
markReadRef.current = markRead;
useEffect(() => {
  if (isOpen) markReadRef.current();
}, [isOpen]); // only depends on isOpen
```

### Pattern: Stabilizing Functions with useCallback

```typescript
// BEFORE:
const loadMonsters = async (version) => { /* ... */ };
useEffect(() => { loadMonsters(rulesetVersion); }, [rulesetVersion]);

// AFTER:
const loadMonsters = useCallback(async (version) => { /* ... */ }, [/* stable deps */]);
useEffect(() => { loadMonsters(rulesetVersion); }, [rulesetVersion, loadMonsters]);
```

### Files to Modify

| File | Line | Pattern | Fix |
|------|------|---------|-----|
| `components/guest/GuestCombatClient.tsx` | 76 | Clears error state on combatants change | deps: `[combatants]` only |
| `components/dice/DiceHistoryPanel.tsx` | 41 | Calls markRead() on isOpen | useRef for markRead or useCallback in parent |
| `components/combat/EncounterSetup.tsx` | 89 | Same as GuestCombatClient | deps: `[combatants]` only |
| `components/combat/MonsterSearchPanel.tsx` | 140 | Loads monsters on rulesetVersion change | useCallback for load fns |

### Anti-Patterns to Avoid

- **DON'T** use `eslint-disable` as a fix — that's what we're removing
- **DON'T** add ALL variables to deps blindly — understand which are stable
- **DON'T** cause infinite re-render loops by adding unstable deps without stabilizing
- **DON'T** use empty deps `[]` when there are real dependencies — creates stale closures
- **DON'T** wrap in `useCallback` with incorrect dependencies

### Project Structure Notes

- No new files needed — only modifications to existing files
- If modifying parent components to add useCallback, check: `DiceHistoryPanel` parent is likely in `components/combat/` or `components/dice/`

### References

- [Source: _bmad-output/implementation-artifacts/v2-epics-0-1-2-stories.md — Story 0.2]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 0, TD2]
- [Source: _bmad-output/planning-artifacts/architecture.md — V2.1 Tech Debt Table]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Completion Notes List
- GuestCombatClient & EncounterSetup: Same pattern — only `combatants` needed in deps, useState setters are stable by React guarantee
- DiceHistoryPanel: Used useRef pattern for `markRead` from Zustand store to prevent potential re-render loops
- MonsterSearchPanel: Added `t` (from useTranslations) to deps — stable per locale, only re-runs on locale change which is desired

### Change Log
- `components/guest/GuestCombatClient.tsx`: Removed eslint-disable, kept `[combatants]` deps
- `components/dice/DiceHistoryPanel.tsx`: Added markReadRef useRef pattern, removed eslint-disable
- `components/combat/EncounterSetup.tsx`: Removed eslint-disable, kept `[combatants]` deps
- `components/combat/MonsterSearchPanel.tsx`: Removed eslint-disable, added `t` to deps

### File List
- `components/guest/GuestCombatClient.tsx`
- `components/dice/DiceHistoryPanel.tsx`
- `components/combat/EncounterSetup.tsx`
- `components/combat/MonsterSearchPanel.tsx`
