# Story B.2.2: Turn Upcoming — "Você é o Próximo" Banner

Status: ready-for-dev

## Story

As a **player**,
I want to see a subtle banner when my turn is coming up next,
so that I can prepare my action before my turn arrives.

## Acceptance Criteria

1. When the combatant BEFORE this player starts their turn, a top banner appears: "Você é o próximo!" / "You're up next!"
2. Banner slides in from top with Framer Motion (y: -50 → 0, duration 0.3s)
3. Banner persists until it's actually this player's turn (then replaced by full overlay from B.2.1)
4. Banner uses accent color, not full-screen (non-intrusive)
5. Works for both registered and anonymous players
6. i18n for all strings

## Tasks / Subtasks

- [ ] Task 1: Complete TurnUpcomingBanner.tsx (AC: #1, #2, #4)
  - [ ] Slide-in animation with Framer Motion
  - [ ] Accent color styling (not blocking)
- [ ] Task 2: Detection logic (AC: #1, #3)
  - [ ] Listen for turn_changed, check if NEXT combatant is this player
  - [ ] Dismiss when this player's turn starts
- [ ] Task 3: Anonymous player support (AC: #5)
  - [ ] Use session token to identify player
- [ ] Task 4: i18n (AC: #6)
- [ ] Task 5: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `components/player/TurnUpcomingBanner.tsx` — complete implementation
- Modify: `components/player/PlayerInitiativeBoard.tsx` — integrate banner

### Dependencies

- B.2.1 (Turn Notification — "É Sua Vez!")

### Anti-Patterns

- **DON'T** make the banner full-screen — it's a subtle hint, not a takeover
- **DON'T** vibrate for upcoming — only vibrate for actual turn

### References

- [Source: _bmad-output/implementation-artifacts/v2-3-1-notification-voce-e-o-proximo.md — original spec]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
