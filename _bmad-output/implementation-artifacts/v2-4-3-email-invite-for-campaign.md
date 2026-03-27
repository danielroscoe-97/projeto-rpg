# Story 4.3: Email Invite for Campaign

Status: ready-for-dev

## Story

As a **DM**,
I want to invite a player to my campaign by email,
so that they can create an account and have their character automatically linked to my campaign.

## Acceptance Criteria

1. Migration 010 creates `campaign_invites`: `id`, `campaign_id`, `invited_by`, `email`, `token` (UNIQUE), `status` (pending/accepted/expired), `created_at`, `expires_at` (+7 days).
2. "Convidar Jogador" button in campaign management. Modal with email input. On submit: creates invite, sends email via Novu `campaign-invite` workflow.
3. Invite link format: `/auth/sign-up?invite={token}&campaign={id}`.
4. Rate limit: max 20 invites per DM per 24h (NFR30). Blocked with message on limit reached.
5. Duplicate pending invite for same email+campaign: blocked with resend option.
6. Invite expires after 7 days -> status='expired'. Expired link shows error page.
7. DM sees invite list: email, status (pending/accepted/expired), date. Can cancel pending invites.

## Tasks / Subtasks

- [ ] Task 1: Migration 010 (AC: #1)
  - [ ] Create `supabase/migrations/010_campaign_invites.sql`
  - [ ] Table with UNIQUE on `token`, CHECK on `status`
  - [ ] `expires_at DEFAULT (now() + interval '7 days')`
  - [ ] RLS: DM inserts where `invited_by = auth.uid()`, SELECT public (validation in app)

- [ ] Task 2: Invite modal UI (AC: #2)
  - [ ] `components/campaign/InvitePlayerDialog.tsx`
  - [ ] Email input + "Enviar Convite" button
  - [ ] Success toast: "Convite enviado para {email}"

- [ ] Task 3: Create invite API (AC: #2, #3, #4, #5)
  - [ ] Generate token: `crypto.randomUUID()`
  - [ ] Check rate limit: `SELECT COUNT(*) FROM campaign_invites WHERE invited_by = auth.uid() AND created_at > now() - interval '24 hours'`
  - [ ] Check duplicate: same email + campaign_id with status='pending'
  - [ ] Insert into `campaign_invites`
  - [ ] Trigger Novu `campaign-invite` workflow with: `{ campaignName, inviteLink, dmName }`

- [ ] Task 4: Invite list (AC: #7)
  - [ ] In campaign management page: list all invites
  - [ ] Show: email, status, date
  - [ ] Cancel button for pending invites

- [ ] Task 5: Expiry handling (AC: #6)
  - [ ] On link click: verify `expires_at > now()` and `status = 'pending'`
  - [ ] If expired: show error page "Este convite expirou"

## Dev Notes

### Files to Create/Modify
- New: `supabase/migrations/010_campaign_invites.sql`
- New: `components/campaign/InvitePlayerDialog.tsx`
- Modify: campaign management page
- Create/modify: API route for invite creation

### Novu Workflow
`campaign-invite`: email channel with template containing campaign name, invite link, DM name.

### i18n Keys
- `campaign.invite.title`, `campaign.invite.email_placeholder`, `campaign.invite.send`
- `campaign.invite.sent`, `campaign.invite.limit_reached`, `campaign.invite.already_pending`

### Anti-Patterns
- **DON'T** skip rate limit check -- 20/day/DM is a hard limit (NFR30)
- **DON'T** expose token generation logic to client -- generate server-side
- **DON'T** auto-delete expired invites -- keep for audit trail

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md -- Story 4.3]
- [Source: _bmad-output/planning-artifacts/architecture.md -- V2.2 Schema campaign_invites]
- [Source: _bmad-output/planning-artifacts/epics.md -- Epic 4, FR54, NFR30]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
