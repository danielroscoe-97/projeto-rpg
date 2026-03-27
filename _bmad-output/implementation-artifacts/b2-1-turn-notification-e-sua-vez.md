# Story B.2.1: Turn Notification — "É Sua Vez!" com Animação

Status: ready-for-dev

## Story

As a **player**,
I want to receive a prominent notification when it's my turn,
so that I can focus on the physical table and still know when to act.

## Acceptance Criteria

1. When DM advances turn to this player, a full-screen overlay appears with "É sua vez!" / "It's your turn!"
2. Overlay uses Framer Motion: scale from 0.5 → 1.0 with spring animation, then auto-dismiss after 3 seconds
3. Device vibration triggered (navigator.vibrate if available)
4. Optional sound effect (configurable in settings, default ON)
5. Overlay is dismissible by tap/click
6. Works even if browser tab is in background (via Novu push notification as fallback)
7. Notification latency ≤200ms from DM action to player screen
8. Player can disable overlay in their settings
9. i18n for all strings

## Tasks / Subtasks

- [ ] Task 1: Complete TurnNotificationOverlay.tsx (AC: #1, #2, #5)
  - [ ] Full-screen overlay with Framer Motion
  - [ ] spring animation: initial={{scale:0.5, opacity:0}} → animate={{scale:1, opacity:1}}
  - [ ] Auto-dismiss timer (3s)
  - [ ] Tap to dismiss
- [ ] Task 2: Vibration + sound (AC: #3, #4)
  - [ ] navigator.vibrate([200, 100, 200]) pattern
  - [ ] Audio element with configurable sound
- [ ] Task 3: Realtime trigger (AC: #7)
  - [ ] Listen for `combat:turn_changed` event
  - [ ] Compare current player ID with turn combatant
  - [ ] Trigger overlay if match
- [ ] Task 4: Novu push fallback (AC: #6)
  - [ ] Novu workflow: `turn-notification`
  - [ ] Triggered server-side on turn advance
  - [ ] In-app + push channels
- [ ] Task 5: Settings toggle (AC: #8)
  - [ ] Add notification preferences to player settings
  - [ ] Persist in localStorage for anonymous players
- [ ] Task 6: i18n (AC: #9)
- [ ] Task 7: Tests
  - [ ] Component test: overlay appears/dismisses
  - [ ] Timer test: auto-dismiss at 3s

## Dev Notes

### Files to Modify/Create

- Modify: `components/player/TurnNotificationOverlay.tsx` — complete implementation
- Modify: `components/player/PlayerInitiativeBoard.tsx` — trigger overlay on turn
- New: `lib/notifications/turn-notification.ts` — Novu workflow trigger
- Modify: `components/settings/SettingsClient.tsx` — notification toggle
- Modify: `messages/en.json`, `messages/pt-BR.json`

### Context

This is the #1 DIFFERENTIATOR of Taverna do Mestre. Players at physical tables look at their phones only when needed. `TurnNotificationOverlay.tsx` and `TurnUpcomingBanner.tsx` exist but Novu is not configured. Framer Motion is installed.

### Anti-Patterns

- **DON'T** rely ONLY on realtime — Novu push is the fallback for background tabs
- **DON'T** play sound without user gesture check (browser policy)
- **DON'T** make the overlay blocking — player must be able to dismiss
- **DON'T** use CSS animations — use Framer Motion for consistency

### References

- [Source: _bmad-output/implementation-artifacts/v2-3-2-notification-e-sua-vez.md — original spec]
- [Source: docs/tech-stack-libraries.md — Framer Motion, Novu sections]
- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — JN-04]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
