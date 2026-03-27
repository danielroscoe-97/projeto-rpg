# Story B.2.4: Feedback Visual de Reconexão

Status: ready-for-dev

## Story

As a **player**,
I want to see clear visual feedback when my connection drops and recovers,
so that I know if I might have missed something.

## Acceptance Criteria

1. When WebSocket disconnects, a banner appears: "Reconectando..." / "Reconnecting..." with spinner
2. Banner uses warning color (amber)
3. When reconnected, banner changes to "Reconectado! Dados atualizados." (green) for 2 seconds then dismisses
4. If polling fallback activates (>3s disconnect), banner shows "Modo de atualização lenta ativado"
5. All text i18n'd
6. Banner does NOT block combat interactions (positioned at top, non-modal)

## Tasks / Subtasks

- [ ] Task 1: Connection status banner (AC: #1, #2, #3)
  - [ ] Subscribe to realtime channel status
  - [ ] Show/hide based on connection state
  - [ ] Framer Motion enter/exit animation
- [ ] Task 2: Polling mode indicator (AC: #4)
- [ ] Task 3: i18n (AC: #5)
- [ ] Task 4: Non-blocking positioning (AC: #6)
- [ ] Task 5: Tests

## Dev Notes

### Files to Modify/Create

- New: `components/ui/ConnectionStatusBanner.tsx` — reusable banner
- Modify: `lib/realtime/use-realtime-channel.ts` — expose connection status
- Modify: `components/player/PlayerInitiativeBoard.tsx` — mount banner
- Modify: `components/session/CombatSessionClient.tsx` — mount banner (DM too)
- Modify: `messages/en.json`, `messages/pt-BR.json`

### Dependencies

- A.0.7 (channel instance)

### Anti-Patterns

- **DON'T** show reconnection status on initial page load — only after established connection drops
- **DON'T** block UI during reconnection

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — JN-05]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
