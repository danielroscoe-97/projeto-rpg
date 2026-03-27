# Story 3.3: Player Auto-Join

Status: ready-for-dev

## Story

As a **registered player**,
I want my character to load automatically when I enter a session linked to my campaign,
so that I can join combat instantly without re-entering my stats.

## Acceptance Criteria

1. Player with `player_character` in session's campaign: form pre-filled with name, HP, AC, spell_save_dc. Fields are editable.
2. If player has multiple characters in campaign: show character selector first, then pre-fill.
3. Anonymous (non-authenticated) players: standard empty lobby form (V1 behavior).
4. DM sees notification "Jogador X entrou (auto)" via Novu `player-joined` workflow.
5. Supabase Presence: player tracked via `channel.track({ userId, characterName, status: 'online' })`. DM sees presence indicator.
6. If combat already active: pre-filled form includes Initiative field for late-join (Story 1.3 integration).
7. "Confirmar e Entrar" button finalizes join.

## Tasks / Subtasks

- [ ] Task 1: Detect registered player with campaign character (AC: #1, #3)
  - [ ] In `app/join/[token]/page.tsx`: after auth check, query:
    ```typescript
    const { data: characters } = await supabase
      .from('player_characters')
      .select('*')
      .eq('campaign_id', session.campaign_id)
      .eq('user_id', user.id);
    ```
  - [ ] If characters found: pass to PlayerLobby as props
  - [ ] If no characters (or anonymous): standard empty form

- [ ] Task 2: Character selector (AC: #2)
  - [ ] If multiple characters: show selector cards before lobby form
  - [ ] On selection: pre-fill form fields

- [ ] Task 3: Pre-filled form (AC: #1, #7)
  - [ ] In PlayerLobby: accept `prefilledCharacter` prop
  - [ ] Pre-fill name, HP, AC, spell_save_dc but keep editable
  - [ ] "Confirmar e Entrar" button

- [ ] Task 4: Supabase Presence tracking (AC: #5)
  - [ ] On player join, call `channel.track({ userId, characterName, status: 'online' })`
  - [ ] Use existing `session:{id}` channel — Presence added to same channel
  - [ ] DM view: show presence dots (online indicator) next to players

- [ ] Task 5: DM notification (AC: #4)
  - [ ] Trigger Novu workflow `player-joined` with payload: `{ playerName, sessionName }`
  - [ ] DM sees in-app notification

- [ ] Task 6: Late-join integration (AC: #6)
  - [ ] If `encounter.is_active`: show Initiative field in pre-filled form
  - [ ] Follows Story 1.3 late-join flow after submit

## Dev Notes

### Dependencies
- Story 4.3 (campaign invite system) — player must be linked to campaign
- Story 1.3 (late-join) — for active combat integration

### Files to Modify
- `app/join/[token]/page.tsx` — auth check + character query
- `components/player/PlayerLobby.tsx` — accept prefilledCharacter prop
- Player view — Presence tracking
- DM view — Presence indicators

### i18n Keys
- `player.auto_join_confirm`: "Confirmar e Entrar"
- `player.select_character`: "Selecione seu personagem"

### Anti-Patterns
- **DON'T** auto-submit without player confirmation — always show "Confirmar e Entrar"
- **DON'T** create extra Realtime channel for Presence — use existing `session:{id}`
- **DON'T** attempt auto-join for anonymous users

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md — Story 3.3]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, FR51b]
- [Source: _bmad-output/planning-artifacts/architecture.md — V2.8 Presence]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
