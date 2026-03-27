# Story A.0.6: Eliminar `as unknown as` no Broadcast e Garantir Type Safety

Status: ready-for-dev

## Story

As a **developer**,
I want broadcast events to be fully type-safe without `as unknown` casts,
so that malformed events are caught at compile time.

## Acceptance Criteria

1. All `as unknown as RealtimeEvent` casts in `broadcast.ts` eliminated
2. Intermediate types created for sanitized payloads (e.g., `SanitizedCombatantEvent`)
3. Sanitization functions return properly typed objects
4. Runtime validation added for critical event fields before broadcast
5. TypeScript strict mode catches any malformed event construction
6. Player-facing events validated before dispatch

## Tasks / Subtasks

- [ ] Task 1: Define intermediate types (AC: #2)
  - [ ] New types in `lib/types/realtime.ts` for sanitized events
- [ ] Task 2: Refactor sanitization functions (AC: #1, #3)
  - [ ] Update `sanitizeCombatant()` return type
  - [ ] Update `sanitizeEvent()` to return proper types
- [ ] Task 3: Add runtime validation (AC: #4, #6)
  - [ ] Validate required fields exist after sanitization
  - [ ] Log warning if fields missing (don't crash)
- [ ] Task 4: Remove all `as unknown as` casts (AC: #1, #5)
- [ ] Task 5: Add tests for sanitization (AC: #1-6)

## Dev Notes

### Files to Modify/Create

- Modify: `lib/realtime/broadcast.ts` — remove casts, use proper types
- Modify: `lib/types/realtime.ts` — add sanitized event types
- New: `lib/realtime/__tests__/broadcast.test.ts` — sanitization tests

### Anti-Patterns

- **DON'T** replace `as unknown as` with just `as` — that's equally unsafe
- **DON'T** make all fields optional to avoid type errors — fix the root cause
- **DON'T** crash on malformed events — log and skip

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — DT-03]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
