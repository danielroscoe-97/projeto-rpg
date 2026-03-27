# Story C.2.2: Auto-Link Character on Invite Acceptance

Status: ready-for-dev

## Story

As a **player**,
I want my character automatically linked when I accept a campaign invite,
so that I don't need manual setup.

## Acceptance Criteria

1. If DM specified a character in the invite, player is auto-linked on acceptance
2. If no character specified, player can choose from available characters
3. Link persists across sessions in the campaign
4. Player can change their character in campaign settings

## Tasks / Subtasks

- [ ] Task 1: Invite with character specification (AC: #1)
- [ ] Task 2: Character selection on accept (AC: #2)
- [ ] Task 3: Persistence (AC: #3)
- [ ] Task 4: Settings change (AC: #4)
- [ ] Task 5: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `app/invite/` — character selection
- Modify: `app/api/campaign/[id]/invites/route.ts` — character field
- Modify: `lib/supabase/session.ts` — character link persistence

### Anti-Patterns

- **DON'T** force character selection — allow "no character" option

### References

- [Source: _bmad-output/implementation-artifacts/v2-4-4-auto-link-character-on-invite.md]
- Dependencies: C.2.1

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
