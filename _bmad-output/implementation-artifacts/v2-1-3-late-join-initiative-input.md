# Story 1.3: Late-Join Initiative Input

Status: ready-for-dev

## Story

As a **player arriving late**,
I want to join an already-active combat session, enter my character info and initiative,
so that the DM can add me to the initiative order without restarting the encounter.

## Acceptance Criteria

1. When player accesses `/join/[token]` and `encounter.is_active === true`, PlayerLobby shows late-join form with: Name (required), HP, AC (optional), Initiative (required, 1-30). Badge "Combate em andamento" visible.
2. On submit, broadcast `combat:late_join_request` with `{ player_name, hp, ac, initiative }`. Player sees "Aguardando aprovação do mestre..." state.
3. DM receives persistent notification (Toast or banner): "[Name] quer entrar no combate (Initiative: X)" with [Aceitar] (green) and [Rejeitar] (red) buttons.
4. On Accept: combatant created via mid-combat add (Story 1.1 infra), `is_player = true`, inserted at correct initiative position. `combat:late_join_response { accepted: true }` sent to player. Player transitions to PlayerInitiativeBoard.
5. On Reject: `combat:late_join_response { accepted: false }` sent. Player sees "O mestre não aceitou sua entrada neste momento." Can retry.
6. Already-registered players (pre-combat) see normal PlayerInitiativeBoard, NOT the late-join form.
7. New realtime event types `combat:late_join_request` and `combat:late_join_response` typed in `realtime.ts`.

## Tasks / Subtasks

- [ ] Task 1: Detect active combat in PlayerLobby (AC: #1, #6)
  - [ ] In `app/join/[token]/page.tsx`: detect `encounter.is_active === true`
  - [ ] In `components/player/PlayerLobby.tsx`: if active, show late-join variant
  - [ ] Add Initiative field (required, 1-30)
  - [ ] Add badge "Combate em andamento" (i18n: `player.combat_in_progress`)
  - [ ] Info message: "O combate já está em andamento. Preencha seus dados para solicitar entrada." (i18n: `player.late_join_info`)
  - [ ] If player already registered (has combatant_id), show PlayerInitiativeBoard instead

- [ ] Task 2: Send late-join request (AC: #2)
  - [ ] On form submit, broadcast `combat:late_join_request`:
    ```typescript
    channel.send({
      type: 'broadcast',
      event: 'combat:late_join_request',
      payload: { player_name, hp, ac, initiative, request_id: crypto.randomUUID() }
    });
    ```
  - [ ] Show waiting state: spinner + "Aguardando aprovação do mestre..." (i18n: `player.late_join_waiting`)
  - [ ] Disable submit button during waiting

- [ ] Task 3: DM notification and accept/reject (AC: #3, #4, #5)
  - [ ] In DM's CombatView, listen for `combat:late_join_request` events
  - [ ] Show persistent notification (Toast with action buttons or custom banner)
  - [ ] [Aceitar]: call `handleAddMidCombat` from Story 1.1 with `is_player = true`, then send:
    ```typescript
    channel.send({
      type: 'broadcast',
      event: 'combat:late_join_response',
      payload: { request_id, accepted: true }
    });
    ```
  - [ ] [Rejeitar]: send `combat:late_join_response { request_id, accepted: false }`
  - [ ] Notification persists until DM acts (no auto-dismiss)

- [ ] Task 4: Player receives response (AC: #4, #5)
  - [ ] Player listens for `combat:late_join_response` matching their `request_id`
  - [ ] If accepted: transition to PlayerInitiativeBoard
  - [ ] If rejected: show message (i18n: `player.late_join_rejected`), re-enable form

- [ ] Task 5: Type definitions (AC: #7)
  - [ ] In `lib/types/realtime.ts`, add:
    ```typescript
    type RealtimeLateJoinRequest = {
      type: 'combat:late_join_request';
      player_name: string;
      hp: number | null;
      ac: number | null;
      initiative: number;
      request_id: string;
    };
    type RealtimeLateJoinResponse = {
      type: 'combat:late_join_response';
      request_id: string;
      accepted: boolean;
    };
    ```

- [ ] Task 6: Persist late-join combatant (AC: #4)
  - [ ] Use `persistNewCombatant` from Story 1.1
  - [ ] Adjust `current_turn_index` via Story 1.1 logic
  - [ ] Broadcast `combat:combatant_add` (sanitized) to all players

## Dev Notes

### Dependencies

This story depends on Story 1.1 (mid-combat add infrastructure). The `handleAddMidCombat` action, initiative insertion logic, and `current_turn_index` adjustment must be implemented first.

### Files to Modify/Create

- Modify: `components/player/PlayerLobby.tsx`, `app/join/[token]/page.tsx`
- Modify: `components/combat/CombatView.tsx` (DM notification listener)
- Modify: `lib/types/realtime.ts` (new event types)
- Modify: `lib/realtime/broadcast.ts` (handler for late-join events)
- Modify: `lib/hooks/useCombatActions.ts` (`handleAcceptLateJoin`, `handleRejectLateJoin`)

### i18n Keys

- `player.combat_in_progress`, `player.late_join_info`, `player.late_join_waiting`
- `player.late_join_rejected`, `player.late_join_submit`
- `combat.late_join_notification` (DM side), `combat.late_join_accept`, `combat.late_join_reject`

### Anti-Patterns

- **DON'T** allow late-join without DM approval — always require Accept/Reject
- **DON'T** auto-dismiss DM notification — it must persist until action taken
- **DON'T** show late-join form for already-registered players
- **DON'T** create combatant before DM accepts — only on Accept

### References

- [Source: _bmad-output/implementation-artifacts/v2-epics-0-1-2-stories.md — Story 1.3]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, FR47]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — UX-DR19 LateJoinForm]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
