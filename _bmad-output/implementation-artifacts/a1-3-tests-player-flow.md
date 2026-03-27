# Story A.1.3: Testes para Player Flow (Join, View, Reconnect)

Status: ready-for-dev

## Story

As a **developer**,
I want tests for the player join and view flow,
so that the anonymous player experience is reliable.

## Acceptance Criteria

1. Tests for PlayerJoinClient: renders join form, submits character name, handles session not found
2. Tests for PlayerLobby: shows waiting state, transitions to combat when DM starts
3. Tests for PlayerInitiativeBoard: renders initiative order, highlights current turn, shows HP bars
4. Tests for GuestCombatClient: renders guest view, handles reconnection
5. Tests mock Supabase auth and realtime properly
6. All tests pass

## Tasks / Subtasks

- [ ] Task 1: Create PlayerJoinClient.test.tsx (AC: #1)
  - [ ] Render, submit, error states
- [ ] Task 2: Create PlayerLobby.test.tsx (AC: #2)
  - [ ] Waiting state, transition
- [ ] Task 3: Create PlayerInitiativeBoard.test.tsx (AC: #3)
  - [ ] Render order, highlight, HP bars with LIGHT/MODERATE/HEAVY/CRITICAL
- [ ] Task 4: Create GuestCombatClient.test.tsx (AC: #4)
  - [ ] Guest view, reconnection

## Dev Notes

### Files to Modify/Create

- New: `components/player/PlayerJoinClient.test.tsx`
- New: `components/player/PlayerLobby.test.tsx`
- New: `components/player/PlayerInitiativeBoard.test.tsx`
- New: `components/guest/GuestCombatClient.test.tsx`

### Context

Players join via session link with anonymous auth. Components: PlayerJoinClient, PlayerLobby, PlayerInitiativeBoard, GuestCombatClient. Currently 0% test coverage for player components.

### Dependencies

A.1.1

### Anti-Patterns

- **DON'T** test styling/CSS — test behavior and content
- **DON'T** mock everything — use testing-library's screen queries
- **DON'T** use HP percentage numbers in assertions — use tier names (LIGHT/MODERATE/HEAVY/CRITICAL)

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — Test Coverage]
- [Source: _bmad-output/planning-artifacts/architecture.md — Player Auth]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
