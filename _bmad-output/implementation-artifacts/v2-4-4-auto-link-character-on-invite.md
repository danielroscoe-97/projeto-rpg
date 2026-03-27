# Story 4.4: Auto-Link Character on Invite Accept

Status: ready-for-dev

## Story

As an **invited player**,
I want my character to be automatically linked to the DM's campaign after I sign up via the invite link,
so that I am ready to join sessions without additional setup.

## Acceptance Criteria

1. Invite link `/auth/sign-up?invite={token}&campaign={id}` shows: "Voce foi convidado para '{campaignName}' por {dmName}". Email pre-filled (editable).
2. After signup: invite `status = 'accepted'`. Redirect to "Criar Personagem" wizard for campaign.
3. Character wizard: name, HP, AC, spell_save_dc. Creates `player_character` linked to campaign.
4. Already-authenticated user clicking invite link: option "Criar novo personagem" or "Vincular existente".
5. Expired token: error page "Este convite expirou. Peca ao seu mestre para enviar um novo."
6. Already-used token: error page "Este convite ja foi utilizado."
7. Signup flow preserves `invite` and `campaign` query params through email confirmation redirect.

## Tasks / Subtasks

- [ ] Task 1: Invite validation in signup page (AC: #1, #5, #6)
  - [ ] Server component: validate token (exists, pending, not expired)
  - [ ] Fetch campaign name and DM name for display
  - [ ] Pre-fill email from invite record

- [ ] Task 2: Post-signup flow (AC: #2, #3, #7)
  - [ ] On successful signup: update invite `status = 'accepted'`
  - [ ] Redirect to character creation wizard
  - [ ] Preserve query params through email confirmation callback

- [ ] Task 3: Character creation wizard (AC: #3)
  - [ ] Page/modal: name, HP, AC, spell_save_dc fields
  - [ ] On save: `INSERT INTO player_characters (campaign_id, user_id, name, hp, ac, spell_save_dc)`
  - [ ] DM sees new character in campaign list

- [ ] Task 4: Existing user flow (AC: #4)
  - [ ] Detect authenticated user
  - [ ] Show: "Criar novo personagem" or "Vincular personagem existente"
  - [ ] "Vincular existente": select from user's characters -> `UPDATE player_characters SET campaign_id = ...`

- [ ] Task 5: Error pages (AC: #5, #6)
  - [ ] Expired: "Este convite expirou. Peca ao seu mestre para enviar um novo." + "Voltar"
  - [ ] Used: "Este convite ja foi utilizado."

## Dev Notes

### Files to Create/Modify
- Modify: `app/auth/sign-up/page.tsx` -- handle invite params
- New: character creation wizard component
- Modify: email confirmation callback -- preserve params

### Anti-Patterns
- **DON'T** skip server-side token validation -- never trust client params
- **DON'T** accept invite before email confirmation
- **DON'T** allow same token to be used twice

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md -- Story 4.4]
- [Source: _bmad-output/planning-artifacts/epics.md -- Epic 4, FR55]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
