# Story B.3.3: Role Selection no Signup

Status: ready-for-dev

## Story

As a **user**,
I want to choose my role (Player, DM, or Both) during signup,
so that the app can personalize my experience.

## Acceptance Criteria

1. After email verification, user sees role selection screen with 3 cards
2. Cards: "Jogador" (Player), "Mestre" (DM), "Ambos" (Both)
3. Selection saved to `users` table `role` column (migration `017_users_role.sql` exists)
4. Dashboard adapts based on role (DM sees campaign management, Player sees join options)
5. Role changeable in settings
6. i18n for all strings

## Tasks / Subtasks

- [ ] Task 1: Complete RoleSelectionCards.tsx (AC: #1, #2)
- [ ] Task 2: Save to database (AC: #3)
- [ ] Task 3: Dashboard adaptation (AC: #4)
- [ ] Task 4: Settings toggle (AC: #5)
- [ ] Task 5: i18n (AC: #6)

## Dev Notes

### Files to Modify/Create

- Modify: `components/auth/RoleSelectionCards.tsx` — complete
- Modify: `app/app/onboarding/role/` — complete page
- Modify: `components/settings/SettingsClient.tsx` — role change
- Modify: `messages/en.json`, `messages/pt-BR.json`

### Anti-Patterns

- **DON'T** force role — "Both" should be the easy default
- **DON'T** hide features based on role — just change defaults/ordering

### References

- [Source: _bmad-output/implementation-artifacts/v2-3-4-role-selection-signup.md]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
