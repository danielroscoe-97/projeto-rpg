# Story C.2.1: Email Invites para Campanha via Novu

Status: ready-for-dev

## Story

As a **DM**,
I want to invite players to my campaign via email,
so that they can join with one click.

## Acceptance Criteria

1. DM enters player emails in campaign settings
2. Novu workflow `campaign-invite` sends branded email
3. Email contains: campaign name, DM name, one-click join link
4. Join link auto-adds player to campaign on click
5. Invite expires after 7 days
6. DM can resend or revoke invites
7. Migration `020_campaign_invites.sql` properly integrated
8. i18n for email template and UI

## Tasks / Subtasks

- [ ] Task 1: Invite UI in campaign settings (AC: #1, #6)
- [ ] Task 2: Novu workflow (AC: #2, #3)
  - [ ] Create `campaign-invite` workflow in Novu
- [ ] Task 3: Join link handler (AC: #4)
  - [ ] `/invite/[token]` route
- [ ] Task 4: Expiry logic (AC: #5)
- [ ] Task 5: Migration integration (AC: #7)
- [ ] Task 6: i18n (AC: #8)
- [ ] Task 7: Tests

## Dev Notes

### Files to Modify/Create

- Modify: `app/api/campaign/[id]/invites/route.ts` — complete (remove TODO)
- Modify: `app/invite/` — join page
- New: `lib/notifications/campaign-invite.ts` — Novu trigger
- Modify: `messages/en.json`, `messages/pt-BR.json`

### Anti-Patterns

- **DON'T** send invites without DM action
- **DON'T** expose campaign details in public invite URL

### References

- [Source: _bmad-output/implementation-artifacts/v2-4-3-email-invite-for-campaign.md]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
