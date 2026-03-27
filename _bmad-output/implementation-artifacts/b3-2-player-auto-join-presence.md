# Story B.3.2: Player Auto-Join via Supabase Presence

Status: ready-for-dev

## Story

As a **DM**,
I want to see when players connect to my session in real-time,
so that I know who's at the table before starting combat.

## Acceptance Criteria

1. When player opens session link, their presence is registered via Supabase Presence
2. DM sees live "Players Online" panel with avatar/name and online indicator (green dot)
3. When player disconnects, indicator turns gray after 5 seconds
4. Player list updates without page refresh
5. Registered players auto-matched to their character in the encounter
6. Anonymous players shown as "Guest: [name they entered]"
7. DM can start combat only when at least one player is online (soft gate, dismissible)

## Tasks / Subtasks

- [ ] Task 1: Presence tracking (AC: #1, #3)
  - [ ] Use Supabase Presence API on session channel
  - [ ] Track {player_id, name, joined_at}
- [ ] Task 2: DM players panel (AC: #2, #6)
  - [ ] Online indicators
  - [ ] Show character name for matched, "Guest: X" for anonymous
- [ ] Task 3: Auto-match registered players (AC: #5)
- [ ] Task 4: Soft gate for combat start (AC: #7)
- [ ] Task 5: Tests

## Dev Notes

### Files to Modify/Create

- New: `components/session/PlayersOnlinePanel.tsx`
- Modify: `lib/realtime/use-realtime-channel.ts` — add Presence tracking
- Modify: `components/session/CombatSessionClient.tsx` — integrate panel
- Modify: `components/player/PlayerJoinClient.tsx` — register presence on join

### Anti-Patterns

- **DON'T** block combat start — only soft gate (DM can dismiss)
- **DON'T** send presence data to other players — DM only

### References

- [Source: _bmad-output/implementation-artifacts/v2-3-3-player-auto-join.md]
- Dependencies: B.2.1

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
