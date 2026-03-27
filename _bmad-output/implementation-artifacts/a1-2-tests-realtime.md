# Story A.1.2: Testes para Realtime (Broadcast, Reconnect, Polling)

Status: ready-for-dev

## Story

As a **developer**,
I want tests for the realtime layer,
so that broadcast, reconnection, and polling fallback logic is verified.

## Acceptance Criteria

1. Tests exist for `broadcast.ts`: getDmChannel, broadcastEvent, sanitizeEvent, sanitizeCombatant
2. Tests exist for `reconnect.ts`: reconnection attempts, backoff logic, state recovery
3. Tests exist for `use-realtime-channel.ts`: channel subscription, disconnect detection, polling fallback activation
4. Sanitization tests verify: DM-only fields stripped from player events, display_name used instead of real name
5. Tests mock Supabase RealtimeChannel properly
6. All tests pass with `npx jest --testPathPattern realtime`

## Tasks / Subtasks

- [ ] Task 1: Create broadcast.test.ts (AC: #1, #4)
  - [ ] Test getDmChannel creates/reuses channel
  - [ ] Test broadcastEvent sends correct payload
  - [ ] Test sanitizeEvent strips DM-only fields
  - [ ] Test sanitizeCombatant replaces name with display_name
- [ ] Task 2: Create reconnect.test.ts (AC: #2)
  - [ ] Test reconnection triggers after disconnect
  - [ ] Test backoff timing
  - [ ] Test state recovery from DB
- [ ] Task 3: Create use-realtime-channel.test.ts (AC: #3)
  - [ ] Test channel subscribes on mount
  - [ ] Test channel unsubscribes on unmount
  - [ ] Test polling activates after 3s disconnect
  - [ ] Test polling deactivates on reconnect

## Dev Notes

### Files to Modify/Create

- New: `lib/realtime/__tests__/broadcast.test.ts`
- New: `lib/realtime/__tests__/reconnect.test.ts`
- New: `lib/realtime/__tests__/use-realtime-channel.test.ts`

### Context

`lib/realtime/` contains broadcast.ts, reconnect.ts, and use-realtime-channel.ts. These handle the dual-write pattern (Zustand -> Broadcast -> DB), reconnection logic with 3-second timeout, and polling fallback. Currently untested.

### Dependencies

A.0.6 (type safety), A.0.7 (channel instance)

### Anti-Patterns

- **DON'T** test Supabase internals — mock the channel
- **DON'T** use real timers in tests — use jest.useFakeTimers()
- **DON'T** test React hooks without renderHook from @testing-library/react

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — Test Coverage]
- [Source: _bmad-output/planning-artifacts/architecture.md — Real-Time Pattern]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
