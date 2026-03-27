# Story A.0.2: Migrar Rate Limiting para Upstash Redis

Status: ready-for-dev

## Story

As a **developer**,
I want rate limiting backed by Upstash Redis,
so that limits persist across serverless cold starts and cannot be bypassed by hitting different instances.

## Context

Current `lib/supabase/proxy.ts` uses in-memory Map that resets on every cold start. The code already has a comment acknowledging this limitation. Upstash Redis has a free tier and REST-based API perfect for edge functions.

## Acceptance Criteria

1. Rate limiting uses Upstash Redis via `@upstash/redis` and `@upstash/ratelimit` packages
2. In-memory Map fallback removed from `lib/supabase/proxy.ts`
3. Rate limit state persists across serverless cold starts
4. Configuration via environment variables: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
5. Sliding window algorithm with same limits as current implementation
6. `.env.example` updated with new env vars
7. Graceful degradation: if Redis unavailable, allow request (fail-open) with warning log

## Tasks / Subtasks

- [ ] Task 1: Install Upstash packages (AC: #1)
  - [ ] `npm install @upstash/redis @upstash/ratelimit`
- [ ] Task 2: Create rate limit utility (AC: #1, #5)
  - [ ] New: `lib/rate-limit.ts` with Upstash sliding window
- [ ] Task 3: Update proxy.ts (AC: #2, #7)
  - [ ] Replace in-memory Map with Upstash calls
  - [ ] Add fail-open with logger.warn
- [ ] Task 4: Update env config (AC: #4, #6)
  - [ ] Add env vars to `.env.example`
- [ ] Task 5: Add tests (AC: #1-7)
  - [ ] Mock Upstash, test rate limiting logic

## Dev Notes

### Files to Modify/Create

- New: `lib/rate-limit.ts` — Upstash rate limit wrapper
- Modify: `lib/supabase/proxy.ts` — replace in-memory with Upstash
- Modify: `.env.example` — add UPSTASH vars
- Modify: `package.json` — new dependencies

### Anti-Patterns

- **DON'T** use `@upstash/redis` with Node.js-only APIs — must work in Edge Runtime
- **DON'T** fail-closed if Redis is down — always fail-open with warning
- **DON'T** use fixed window — use sliding window for better UX

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — DT-02]
- [Source: docs/tech-stack-libraries.md — Rate Limiting section]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
