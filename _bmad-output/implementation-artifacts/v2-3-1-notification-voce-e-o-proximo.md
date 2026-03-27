# Story 3.1: Notificação "Você é o Próximo"

Status: ready-for-dev

## Story

As a **player**,
I want to receive a visual notification when it is one turn before my turn,
so that I can prepare my action and keep combat flowing without delays.

## Acceptance Criteria

1. Broadcast `combat:turn_advance` payload includes `next_combatant_id` (combatant whose turn is next after current).
2. Player whose `combatant_id === next_combatant_id` sees amber banner "Você é o próximo!" at top of player view. Appears ≤200ms after broadcast (NFR31).
3. Only shown for player combatants (`is_player === true`), not for monsters.
4. Banner uses `aria-live="polite"` and `role="status"` for screen readers.
5. When DM advances again and it becomes this player's turn, banner transitions to "É sua vez!" (Story 3.2) with no overlap.
6. If player is NOT next, no banner shown. If combat ends, all banners removed.

## Tasks / Subtasks

- [ ] Task 1: Add `next_combatant_id` to turn advance broadcast (AC: #1)
  - [ ] In turn advance logic (combat-store or useCombatActions): compute next combatant after the new current
  - [ ] Include `next_combatant_id` in `combat:turn_advance` payload

- [ ] Task 2: Player-side banner component (AC: #2, #4)
  - [ ] Create `components/player/TurnUpcomingBanner.tsx`
  - [ ] Amber/gold banner: "Você é o próximo!" (i18n: `player.turn_upcoming`)
  - [ ] `aria-live="polite"`, `role="status"`
  - [ ] Appears at top of player view

- [ ] Task 3: Client-side matching logic (AC: #2, #3, #5)
  - [ ] In player view: listen for `combat:turn_advance`
  - [ ] Compare `next_combatant_id` with local player's `combatant_id`
  - [ ] Only show if combatant `is_player === true`
  - [ ] If `current_combatant_id === player.combatant_id`: show "É sua vez!" instead (Story 3.2)
  - [ ] If combat ends (`combat:end`): remove all banners

- [ ] Task 4: Hide when not relevant (AC: #6)
  - [ ] Clear banner when player is no longer "next"
  - [ ] Clear on `combat:end` event

## Dev Notes

### Performance: ≤200ms (NFR31)
This is entirely client-side. The broadcast arrives via WebSocket, and the banner renders from local state. No server request needed. The ≤200ms target is easily achievable.

### Files to Create/Modify
- New: `components/player/TurnUpcomingBanner.tsx`
- Modify: turn advance logic in `lib/stores/combat-store.ts` or `lib/hooks/useCombatActions.ts` — add `next_combatant_id` to payload
- Modify: player view component to render banner conditionally

### i18n Keys
- `player.turn_upcoming`: "Você é o próximo!"

### Anti-Patterns
- **DON'T** make server requests to check turn status — use broadcast data
- **DON'T** show notification for monsters — only `is_player === true`
- **DON'T** allow banners to overlap (upcoming + current turn)

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md — Story 3.1]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, FR48, NFR31]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — UX-DR20 TurnUpcomingBanner]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
