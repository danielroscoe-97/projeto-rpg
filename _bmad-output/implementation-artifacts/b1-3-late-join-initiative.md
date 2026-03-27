# Story B.1.3: Late-Join — DM Aprova/Rejeita Entrada de Jogador

Status: ready-for-dev

## Story

As a **DM**,
I want to approve or reject players who join mid-combat,
so that I control who enters the encounter and can assign their initiative.

## Context

Currently players can only join before combat starts. Spec exists at v2-1-3. Requires: Supabase Presence for join detection, DM approval UI, initiative assignment for late joiner.

## Acceptance Criteria

1. Player opening session link during active combat sees "Aguardando aprovacao do mestre" screen
2. DM receives notification banner: "[Player Name] quer entrar no combate"
3. DM can Approve (with initiative input) or Reject
4. On Approve: player appears in initiative order at DM-specified position
5. On Reject: player sees "O mestre negou sua entrada" message
6. Late-join request expires after 60 seconds if DM doesn't respond
7. Broadcast events for join_request, join_approved, join_rejected
8. i18n for all new UI strings

## Tasks / Subtasks

- [ ] Task 1: Player join request flow (AC: #1, #7)
  - [ ] Player sends `session:join_request` broadcast event
  - [ ] Player shows waiting screen
- [ ] Task 2: DM notification (AC: #2)
  - [ ] Banner/toast in DM view with player name
  - [ ] Approve/Reject buttons
- [ ] Task 3: Approve flow (AC: #3, #4)
  - [ ] DM inputs initiative for late joiner
  - [ ] `session:join_approved` broadcast
  - [ ] Player added to initiative order
- [ ] Task 4: Reject flow (AC: #5)
  - [ ] `session:join_rejected` broadcast
  - [ ] Player sees rejection message
- [ ] Task 5: Timeout (AC: #6)
  - [ ] 60s timer, auto-reject on expire
- [ ] Task 6: Tests

## Dev Notes

### Files to Modify/Create

- New: `components/combat/LateJoinApproval.tsx` — DM approval UI
- New: `components/player/LateJoinWaiting.tsx` — player waiting screen
- Modify: `lib/types/realtime.ts` — join_request/approved/rejected events
- Modify: `lib/realtime/broadcast.ts` — new event handlers
- Modify: `components/session/CombatSessionClient.tsx` — integrate LateJoinApproval
- Modify: `components/player/PlayerJoinClient.tsx` — detect mid-combat join
- Modify: `messages/en.json`, `messages/pt-BR.json`

### Dependencies

B.1.1 (add combatant mid-combat)

### Anti-Patterns

- **DON'T** auto-approve joins — DM must always decide
- **DON'T** allow player to see combat state before approval
- **DON'T** block DM combat controls while join request is pending

### References

- [Source: _bmad-output/implementation-artifacts/v2-1-3-late-join-initiative-input.md — original spec]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
