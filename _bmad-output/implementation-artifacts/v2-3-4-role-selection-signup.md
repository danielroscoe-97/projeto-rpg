# Story 3.4: Role Selection on Signup

Status: ready-for-dev

## Story

As a **new user**,
I want to select my role (Player, DM, or Both) during signup,
so that the app adapts its dashboard and features to how I use it.

## Acceptance Criteria

1. Migration 013 adds `role TEXT DEFAULT 'both' CHECK (role IN ('player', 'dm', 'both'))` to `users`. Existing users get `'both'`.
2. After email/password signup, new step: "Como você vai usar o Pocket DM?" with 3 selectable cards: "Jogador", "Mestre", "Ambos". Default: "Ambos".
3. Selected role saved to `users.role`. User redirected to dashboard.
4. Dashboard adapts: Player sees campaigns/characters. DM sees encounter builder/management. Both sees everything + context switcher.
5. "Pular" (skip) option defaults to `'both'`.
6. Role changeable anytime in Settings → Perfil.

## Tasks / Subtasks

- [ ] Task 1: Create migration 013_users_v2.sql (AC: #1)
  - [ ] `ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'both' CHECK (role IN ('player', 'dm', 'both'));`
  - [ ] Also add `subscription_id UUID REFERENCES subscriptions(id)` (needed for Epic 5)

- [ ] Task 2: Role selection step in signup flow (AC: #2, #5)
  - [ ] After successful signup, redirect to role selection page/step
  - [ ] 3 cards: Jogador (Sword icon), Mestre (Shield/Crown icon), Ambos (both icons)
  - [ ] "Ambos" selected by default
  - [ ] "Pular" link at bottom → defaults to 'both'
  - [ ] i18n: `signup.role_selection.title`, `.player`, `.dm`, `.both`, `.skip`

- [ ] Task 3: Save role (AC: #3)
  - [ ] On selection + "Continuar": `supabase.from('users').update({ role }).eq('id', user.id)`
  - [ ] Redirect to dashboard

- [ ] Task 4: Dashboard adaptation (AC: #4)
  - [ ] Load `users.role` via session
  - [ ] Conditional rendering based on role
  - [ ] `role === 'both'`: show context switcher (toggle between DM/Player views)

- [ ] Task 5: Settings → Profile role change (AC: #6)
  - [ ] Add role selector in Settings page
  - [ ] Same 3 options as signup
  - [ ] Changes reflected immediately in dashboard

## Dev Notes

### Migration Numbering
013_users_v2.sql adds both `role` and `subscription_id` columns. The `subscription_id` column is needed for Epic 5 (subscriptions) but can be added now as nullable.

### Files to Create/Modify
- New: `supabase/migrations/013_users_v2.sql`
- New: `components/auth/RoleSelectionCards.tsx`
- Modify: signup flow (post-signup redirect)
- Modify: dashboard layout (conditional rendering)
- Modify: Settings page (role change)

### i18n Keys
- `signup.role_selection.title`: "Como você vai usar o Pocket DM?"
- `signup.role_selection.player`: "Jogador"
- `signup.role_selection.dm`: "Mestre"
- `signup.role_selection.both`: "Ambos"
- `signup.role_selection.skip`: "Pular"

### Anti-Patterns
- **DON'T** hide features completely based on role — just deprioritize in UI
- **DON'T** require role selection before email confirmation
- **DON'T** use role for authorization — it's UI personalization only

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md — Story 3.4]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, FR50]
- [Source: _bmad-output/planning-artifacts/architecture.md — V2.2 Schema users columns]

## Dev Agent Record
### Agent Model Used
### Completion Notes List
### Change Log
### File List
