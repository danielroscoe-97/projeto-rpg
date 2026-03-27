# Story 3.2: Notificação "É Sua Vez!"

Status: ready-for-dev

## Story

As a **player**,
I want to receive a prominent visual notification when it is my turn in combat,
so that I know immediately when to act, even if I am not looking at the screen.

## Acceptance Criteria

1. When `current_turn_index` points to player's combatant, banner "É sua vez, {playerName}!" appears with pulse animation (Framer Motion) and amber background overlay.
2. Appears ≤200ms after DM's turn advance broadcast (NFR31).
3. `navigator.vibrate([200])` called for haptic feedback. Silently ignored if unavailable (desktop, iOS Safari).
4. Banner uses `aria-live="assertive"` to interrupt screen readers immediately.
5. Notification persists during entire turn (no auto-dismiss). Removed when DM advances to next combatant.
6. Background overlay: amber tint with low opacity, transitions smoothly (200ms).
7. On `combat:end`: all notifications removed immediately.

## Tasks / Subtasks

- [ ] Task 1: Create TurnNotificationOverlay component (AC: #1, #4, #6)
  - [ ] Create `components/player/TurnNotificationOverlay.tsx`
  - [ ] Banner: "É sua vez, {playerName}!" (i18n: `player.turn_now`)
  - [ ] Pulse animation via Framer Motion: `animate={{ scale: [1, 1.02, 1] }}` with `repeat: Infinity`
  - [ ] Amber background overlay: CSS variable toggle or Framer Motion opacity
  - [ ] `aria-live="assertive"`

- [ ] Task 2: Haptic feedback (AC: #3)
  - [ ] Call `navigator.vibrate?.([200])` with optional chaining (safe for all browsers)
  - [ ] No try/catch needed — optional chaining handles missing API

- [ ] Task 3: Persistence and cleanup (AC: #5, #7)
  - [ ] Banner stays visible while it's player's turn
  - [ ] On next `combat:turn_advance` where current != player: remove banner + overlay
  - [ ] On `combat:end`: remove immediately
  - [ ] Smooth transition out (200ms fade)

- [ ] Task 4: Integration with Story 3.1 (AC: #1)
  - [ ] When player transitions from "upcoming" to "current turn":
  - [ ] Replace TurnUpcomingBanner with TurnNotificationOverlay (no overlap)

## Dev Notes

### Files to Create/Modify
- New: `components/player/TurnNotificationOverlay.tsx`
- Modify: player view to render overlay conditionally based on current turn state

### Animation
```typescript
<motion.div
  animate={{ scale: [1, 1.02, 1] }}
  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
  className="bg-amber-500/20 border border-amber-400 rounded-lg p-4"
>
  <span aria-live="assertive">É sua vez, {playerName}!</span>
</motion.div>
```

### i18n Keys
- `player.turn_now`: "É sua vez, {playerName}!"

### Anti-Patterns
- **DON'T** auto-dismiss the notification — it must persist during entire turn
- **DON'T** use `alert()` or `Notification API` — use inline overlay
- **DON'T** vibrate repeatedly — single 200ms pulse on turn start only

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md — Story 3.2]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, FR49, NFR31]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — UX-DR20 TurnNotificationOverlay]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
