# Story 0.4: Cleanup setTimeout Leaks

Status: review

## Story

As a **developer**,
I want to store setTimeout IDs in refs and clear them in useEffect cleanup functions,
so that timeouts are properly cancelled when components unmount, preventing memory leaks and state updates on unmounted components.

## Acceptance Criteria

1. **OracleAIModal.tsx:46** — setTimeout ID stored in `useRef`, cleared in useEffect cleanup. No state update on unmounted component.
2. **code-block.tsx:45** — setTimeout ID stored in `useRef`, cleared in useEffect cleanup. Previous timeout cleared before setting new one.
3. **PlayerLobby.tsx** — All setTimeouts (if any) have proper cleanup. If none found, document in PR.
4. Zero "Can't perform a React state update on an unmounted component" warnings in console.
5. Functional behavior preserved: focus timing, copy icon reset, any animations.

## Tasks / Subtasks

- [x] Task 1: Fix OracleAIModal.tsx setTimeout (AC: #1, #4)
  - [x] Read `components/oracle/OracleAIModal.tsx` around line 46
  - [x] Add `const focusTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)`
  - [x] Store timeout: `focusTimerRef.current = setTimeout(...)`
  - [x] Add cleanup: `return () => clearTimeout(focusTimerRef.current)` in the useEffect

- [x] Task 2: Fix code-block.tsx setTimeout (AC: #2, #4)
  - [x] Read `components/tutorial/code-block.tsx` around line 45
  - [x] Add `const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)`
  - [x] Before setting new timeout, clear previous: `clearTimeout(resetTimerRef.current)`
  - [x] Store timeout: `resetTimerRef.current = setTimeout(...)`
  - [x] Add useEffect cleanup to clear on unmount

- [x] Task 3: Audit PlayerLobby.tsx (AC: #3)
  - [x] Read `components/player/PlayerLobby.tsx` completely
  - [x] No setTimeout found in PlayerLobby.tsx

- [x] Task 4: Verification (AC: #4, #5)
  - [x] Run `next build` — passes clean

## Dev Notes

### Standard Pattern to Apply

Every setTimeout in a React component should follow this pattern:

```typescript
// 1. Create ref to store timeout ID
const timerRef = useRef<ReturnType<typeof setTimeout>>();

// 2. In the effect or handler, store the ID
useEffect(() => {
  timerRef.current = setTimeout(() => {
    // work here
  }, delay);

  // 3. Clear on cleanup (unmount or re-run)
  return () => clearTimeout(timerRef.current);
}, [deps]);
```

### OracleAIModal.tsx — Expected Change

**BEFORE (line ~46):**
```typescript
useEffect(() => {
  if (isOpen) {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }
}, [isOpen]);
```

**AFTER:**
```typescript
const focusTimerRef = useRef<ReturnType<typeof setTimeout>>();

useEffect(() => {
  if (isOpen) {
    focusTimerRef.current = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }
  return () => clearTimeout(focusTimerRef.current);
}, [isOpen]);
```

### code-block.tsx — Expected Change

**BEFORE (line ~45):**
```typescript
const handleCopy = () => {
  navigator.clipboard.writeText(code);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};
```

**AFTER:**
```typescript
const resetTimerRef = useRef<ReturnType<typeof setTimeout>>();

// Cleanup on unmount
useEffect(() => {
  return () => clearTimeout(resetTimerRef.current);
}, []);

const handleCopy = () => {
  navigator.clipboard.writeText(code);
  setCopied(true);
  clearTimeout(resetTimerRef.current); // clear previous timeout
  resetTimerRef.current = setTimeout(() => setCopied(false), 2000);
};
```

### Files to Modify

| File | Line | setTimeout Purpose | Fix |
|------|------|--------------------|-----|
| `components/oracle/OracleAIModal.tsx` | ~46 | Focus input after modal opens (50ms) | useRef + cleanup in useEffect |
| `components/tutorial/code-block.tsx` | ~45 | Reset copy icon after 2s | useRef + clear previous + cleanup on unmount |
| `components/player/PlayerLobby.tsx` | TBD | Audit — may or may not have setTimeout | Fix if found, document if not |

### Anti-Patterns to Avoid

- **DON'T** use `window.setTimeout` — use `setTimeout` directly (TypeScript types work better)
- **DON'T** store timeout ID in state — use `useRef` (setState triggers re-render)
- **DON'T** forget to clear previous timeout before setting a new one (code-block copy button can be clicked multiple times)
- **DON'T** add cleanup to the wrong useEffect — make sure cleanup matches the effect that creates the timeout

### Project Structure Notes

- No new files needed — only modifications to existing components
- `useRef` import may already exist; add to existing React import if not

### References

- [Source: _bmad-output/implementation-artifacts/v2-epics-0-1-2-stories.md — Story 0.4]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 0, TD5]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Completion Notes List
- OracleAIModal: Added focusTimerRef with cleanup in the open-focus useEffect
- code-block: Added resetTimerRef with cleanup on unmount + clear previous before setting new
- PlayerLobby: No setTimeout found — no changes needed
- Note: React 19 (Next.js 16) requires useRef initial value — used `undefined` explicitly

### Change Log
- `components/oracle/OracleAIModal.tsx`: Added focusTimerRef + cleanup in focus useEffect
- `components/tutorial/code-block.tsx`: Added resetTimerRef + cleanup useEffect + clear previous in copy handler

### File List
- `components/oracle/OracleAIModal.tsx`
- `components/tutorial/code-block.tsx`
