# Story B.3.4: DM Vincula Jogador Temporário a Personagem

Status: ready-for-dev

## Story

As a **DM**,
I want to link an anonymous guest player to a saved character,
so that their identity persists across sessions.

## Acceptance Criteria

1. DM can select a guest player and link them to an existing character from the campaign
2. Once linked, the guest player's actions are attributed to that character
3. If the guest reconnects (same browser), they're auto-linked to the same character
4. DM can unlink at any time
5. Linking persists to database (session_tokens table updated with character_id)

## Tasks / Subtasks

- [ ] Task 1: Link UI in DM player list (AC: #1)
  - [ ] Dropdown of available characters
- [ ] Task 2: Link persistence (AC: #5)
  - [ ] Update session_tokens with character_id
- [ ] Task 3: Auto-relink (AC: #3)
  - [ ] On reconnect, check session_token for existing link
- [ ] Task 4: Unlink (AC: #4)
- [ ] Task 5: Tests

## Dev Notes

### Files to Modify/Create

- New: `components/session/LinkPlayerCharacterDialog.tsx`
- Modify: `lib/supabase/session.ts` — link/unlink operations
- Modify: `components/session/PlayersOnlinePanel.tsx` — link button

### Anti-Patterns

- **DON'T** auto-link without DM action
- **DON'T** allow player to choose their own character link

### References

- [Source: _bmad-output/implementation-artifacts/v2-3-5-dm-link-temp-player-to-character.md]
- Dependencies: B.3.2

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
