# Story A.0.3: Substituir console.error por Structured Logging + Sentry

Status: ready-for-dev

## Story

As a **developer**,
I want all error logging centralized through Sentry with structured metadata,
so that production errors are tracked, categorized, and actionable.

## Context

40+ catch blocks across the codebase use `console.error()`. In serverless (Vercel), these logs are ephemeral and hard to search. Sentry is already installed (`@sentry/nextjs` ^10.45) but most errors bypass it.

## Acceptance Criteria

1. All `console.error()` calls in production code replaced with `Sentry.captureException()` or `Sentry.captureMessage()`
2. Each error includes structured context: `{ component, action, userId?, sessionId? }`
3. `console.warn()` calls reviewed — keep for dev-only, replace with Sentry breadcrumbs for important ones
4. Error categories established: `validation`, `database`, `network`, `realtime`, `auth`, `payment`
5. No `console.log` or `console.error` in API routes or lib/ (only in development via `if (process.env.NODE_ENV === 'development')`)
6. Sentry error boundaries wrap key layout segments

## Tasks / Subtasks

- [ ] Task 1: Create error utility (AC: #2, #4)
  - [ ] New: `lib/errors/capture.ts` — wrapper with context enrichment
- [ ] Task 2: Audit and replace console.error in lib/ (AC: #1, #5)
  - [ ] `lib/hooks/useCombatActions.ts`
  - [ ] `lib/realtime/broadcast.ts`
  - [ ] `lib/realtime/reconnect.ts`
  - [ ] `lib/supabase/*.ts`
  - [ ] `lib/stores/*.ts`
- [ ] Task 3: Audit and replace in components/ (AC: #1, #5)
  - [ ] `components/dashboard/*.tsx`
  - [ ] `components/oracle/*.tsx`
  - [ ] `components/combat/*.tsx`
  - [ ] `components/session/*.tsx`
- [ ] Task 4: Audit and replace in app/api/ (AC: #1, #5)
  - [ ] All API route handlers
- [ ] Task 5: Verify Sentry error boundaries (AC: #6)

## Dev Notes

### Files to Modify/Create

- New: `lib/errors/capture.ts` — structured error capture utility
- Modify: All files with `console.error` (~40 files)

### Anti-Patterns

- **DON'T** remove error messages from toast/UI — only replace the logging backend
- **DON'T** send PII (email, passwords) to Sentry
- **DON'T** use Sentry in test files — mock it

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — DT-07]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
