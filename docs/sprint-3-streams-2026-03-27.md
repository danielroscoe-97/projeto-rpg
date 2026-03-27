# Sprint 3 — Streams A0/A1/C1/C2 (2026-03-27)

## Overview

Full execution of 4 parallel streams: Infrastructure hardening, test coverage expansion, monetization wiring, and advanced features completion.

## Stream A0 — Infrastructure (8 stories)

All 8 stories were **already implemented** on master. Verified and confirmed:

| Story | Description | Status |
|-------|------------|--------|
| a0-1 | Renumber migrations (001-027) | Already done |
| a0-2 | Upstash Redis rate limiting | Already done |
| a0-3 | Structured Sentry logging | **Fixed** — added captureError to 5 API routes |
| a0-4 | ESLint hooks + security rules | Already done |
| a0-5 | setTimeout/setInterval cleanup | Already done |
| a0-6 | Broadcast type safety | Already done |
| a0-7 | Session-scoped realtime channels | Already done |
| a0-8 | getState() atomicity | Already done |

## Stream A1 — Tests (4 stories)

| Story | Description | Tests Added | Key Coverage |
|-------|------------|-------------|--------------|
| a1-1 | Combat store tests | +18 tests | Undo stack, monster grouping, toggleGroupExpanded |
| a1-2 | Realtime tests | +16 tests | Reconnect state recovery, channel hook lifecycle, polling fallback |
| a1-3 | Player flow tests | +29 tests | PlayerJoinClient auth flow, GuestCombatClient setup/combat phases |
| a1-4 | E2E framework | Playwright config | 9-step combat-full-flow.spec.ts |

**Total new tests: 146 passing** (8 suites)

## Stream C1 — Monetization (6 stories)

Most features were already fully implemented. Key additions:

| Story | Description | Status |
|-------|------------|--------|
| c1-1 | Feature flags (server + client + hook) | Already done + **37 tests added** |
| c1-2 | Stripe checkout flow | Already done |
| c1-3 | Subscription management panel | Already done |
| c1-4 | 14-day free trial | Already done |
| c1-5 | Mesa model (players inherit DM's Pro) | **Fixed** — wired setSessionDmPlan on player join |
| c1-6 | Pro indicators + upsell UI | Already done |

### Mesa Model Fix (c1-5)

The Mesa model had all infrastructure in place (DB column, store methods, types) but was **never wired**. Fixed by:
1. Added `dm_plan` to session select in `/app/join/[token]/page.tsx`
2. Added useEffect in PlayerJoinClient to call `setSessionDmPlan()` on mount (+ cleanup on unmount)
3. Added `dm_plan` to `/api/session/[id]/state` API response for reconnect hydration
4. Runtime validation of dm_plan as `Plan` type

## Stream C2 — Advanced Features (4 stories)

| Story | Description | Status |
|-------|------------|--------|
| c2-1 | Email invites via Novu | **Implemented** — campaign-invite.ts trigger, fail-open |
| c2-2 | Auto-link character on invite | Already done |
| c2-3 | CR calculator (2014 + 2024) | Already done |
| c2-4 | Homebrew content creation | Already done |

## Code Review Fixes

| Priority | Issue | Resolution |
|----------|-------|------------|
| P0 | Mesa model dead code | Wired dm_plan fetch → prop → useEffect → store |
| P0 | PII leak (email to Sentry) | Removed email from captureError extra field |
| P1 | Origin header spoofable in invite link | Changed to NEXT_PUBLIC_APP_URL |
| P1 | Email validation too permissive | Added regex validation |
| P1 | Session state API missing dm_plan | Added dm_plan query + response |
| P1 | TS circular reference in test | Added explicit type annotations |

## Branches

| Branch | Content |
|--------|---------|
| `fix/cr-qa-fixes` | All fixes + all test files (consolidated) |
| `feat/a0-3-structured-logging-sentry` | API route error capture |
| `feat/a1-1-tests-combat-store` | Combat store undo/grouping tests |
| `feat/a1-2-tests-realtime` | Realtime reconnect + channel tests |
| `feat/a1-3-tests-player-flow` | Player join + guest combat tests |
| `feat/a1-4-tests-e2e-full-flow` | Playwright config + E2E spec |
| `feat/c1-1-feature-flags-e2e` | Feature flag + subscription tests |
| `feat/c1-5-mesa-model` | Mesa model wiring |
| `feat/c2-1-email-invites-novu` | Novu email invite trigger |

## Deploy Checklist

- [ ] Merge `fix/cr-qa-fixes` to master (contains all consolidated work)
- [ ] Set env vars: `NOVU_API_KEY` (optional, fail-open)
- [ ] Ensure `NEXT_PUBLIC_APP_URL` is set for invite email links
- [ ] Run `npx playwright install chromium` in CI for E2E
- [ ] Flip feature flags `plan_required` from `free` to `pro` when ready to gate
- [ ] Verify TrialBanner is integrated into app layout (pending)
