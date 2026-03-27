# Story 5.5: Mesa Model

Status: done

## Story

As a **DM with Pro/Mesa subscription**,
I want my connected players to inherit Pro features during my active session,
so that the entire table benefits from a single subscription.

## Acceptance Criteria

1. `sessions.dm_plan` filled on session creation with DM's current plan ('pro', 'mesa', or 'free'). Snapshot — does NOT change when subscription changes.
2. Players in session where `dm_plan IN ('pro', 'mesa')`: Pro features unlocked via RLS + `useFeatureGate` session context.
3. DM subscription expires mid-session: `sessions.dm_plan` unchanged (graceful degradation NFR34). Features continue until session ends.
4. New session after expiry: `dm_plan = 'free'`. Pro features not available.
5. Player outside session context: reverts to individual plan.
6. `useFeatureGate` checks: (1) individual plan, (2) session dm_plan. Allowed if either sufficient.
7. RLS: `EXISTS (SELECT 1 FROM sessions s WHERE s.dm_plan IN ('pro', 'mesa') AND player_is_participant)`.

## Tasks / Subtasks

- [ ] Task 1: Add dm_plan to sessions (AC: #1)
  - [ ] Migration or alter: `ALTER TABLE sessions ADD COLUMN dm_plan TEXT DEFAULT 'free'`
  - [ ] On session creation: set from current subscription plan

- [ ] Task 2: RLS policies (AC: #2, #7)
  - [ ] Create RLS policies that check `sessions.dm_plan` for player access to Pro features

- [ ] Task 3: useFeatureGate session context (AC: #2, #6)
  - [ ] Extend hook to accept optional `sessionId`
  - [ ] Check both individual plan AND session dm_plan

- [ ] Task 4: Graceful degradation (AC: #3, #4)
  - [ ] dm_plan is snapshot at creation — NOT updated when subscription changes
  - [ ] New sessions use current plan

- [ ] Task 5: Player context awareness (AC: #5)
  - [ ] Outside session: only individual plan checked
  - [ ] Inside session: both checked

## Dev Notes

### Key Design Decision
`dm_plan` is a SNAPSHOT at session creation time. This ensures:
- Active sessions are never disrupted by subscription changes
- Graceful degradation is guaranteed (NFR34)
- New sessions correctly reflect current plan

### Files to Modify
- Migration or alter for `sessions.dm_plan`
- `lib/hooks/use-feature-gate.ts` — add session context
- RLS policies
- Session creation logic — set dm_plan

### Anti-Patterns
- **DON'T** dynamically update dm_plan when subscription changes — it's a snapshot
- **DON'T** apply Mesa to trial — individual only
- **DON'T** give players permanent Pro from a single session — only during active session

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md — Story 5.5]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, FR60, NFR34]

## Dev Agent Record
### Agent Model Used
Claude Opus 4.6 (Stream B, Agent 2)

### Completion Notes List
- Status: DONE — implemented, build passing, CR fixes applied, migrations deployed
- All features open to everyone (plan_required = 'free') — monetization deferred
- Code reviewed: 3 CRITICAL + 4 HIGH + 3 MEDIUM issues found and fixed

### Change Log
- 2026-03-27: Initial implementation
- 2026-03-27: Code review fixes (trial race condition, RLS policy, webhook error handling, open redirect, status mapping)
- 2026-03-27: Migrations applied to Supabase remote

### File List
- supabase/migrations/021_mesa_model.sql
- lib/supabase/encounter.ts (modified)
- lib/hooks/use-feature-gate.ts (session context)
