# Story A.0.7: Refatorar Realtime Channel — Instância por Sessão

Status: ready-for-dev

## Story

As a **developer**,
I want each session to have its own Realtime channel instance,
so that rapid session switches don't cause broadcasts on the wrong channel.

## Acceptance Criteria

1. Module-level singleton `let channel` replaced with session-scoped instances
2. Channel creation tied to session lifecycle (create on join, destroy on leave)
3. Stale channel detection: if session ID changes, old channel is unsubscribed
4. No broadcast can be sent to a channel whose session ID doesn't match current
5. Channel subscription errors are logged via Sentry (from A.0.3)
6. Existing API (`getDmChannel`, `broadcastEvent`) maintained for backward compatibility

## Tasks / Subtasks

- [ ] Task 1: Design channel manager (AC: #1, #2)
  - [ ] Create `ChannelManager` class or factory function
- [ ] Task 2: Implement session-scoped channels (AC: #1, #3)
  - [ ] Map<sessionId, RealtimeChannel>
  - [ ] Auto-cleanup on session change
- [ ] Task 3: Add guard on broadcast (AC: #4)
  - [ ] Validate session ID before every send
- [ ] Task 4: Error handling (AC: #5)
  - [ ] Subscription error → Sentry capture
- [ ] Task 5: Maintain backward compat (AC: #6)
  - [ ] `getDmChannel()` and `broadcastEvent()` still work

## Dev Notes

### Files to Modify/Create

- Modify: `lib/realtime/broadcast.ts` — replace singleton with session-scoped
- Modify: `lib/realtime/use-realtime-channel.ts` — use new channel manager

### Dependencies

A.0.6 (type safety for events)

### Anti-Patterns

- **DON'T** keep multiple channels subscribed simultaneously — unsubscribe old before new
- **DON'T** break existing component code that calls getDmChannel()

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — DT-08]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
