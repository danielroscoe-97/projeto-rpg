# Story 5.1: Feature Flag System

Status: done

## Story

As a **developer / admin**,
I want a feature flag system backed by a Supabase table with client-side caching,
so that Pro features can be gated, toggled, and rolled back without redeploying.

## Acceptance Criteria

1. Migration 007 creates `feature_flags` table: `id`, `key` (UNIQUE), `enabled` (BOOLEAN), `plan_required` (TEXT), `description`, `updated_at`. Seed 8 flags: `persistent_campaigns`, `saved_presets`, `export_data`, `homebrew`, `session_analytics`, `cr_calculator`, `file_sharing`, `email_invites` — all `enabled=true`, `plan_required='pro'`.
2. Hook `useFeatureGate(flagKey)` returns `{ allowed: boolean, loading: boolean }`. Checks flag enabled + user plan.
3. Client-side cache: flags loaded once, cached in memory with 5min TTL. Stale-while-revalidate on expiry.
4. Pro user (`plan = 'pro'` or `'mesa'`): `{ allowed: true }`. Free user: `{ allowed: false }` for Pro flags.
5. Flag `enabled = false`: blocked for ALL users (global kill switch).
6. Server-side helper `checkFeatureFlag(flagKey, userPlan)`: direct DB query, no cache. Resolves ≤500ms (NFR29). Returns 403 for unauthorized.
7. Fallback on Supabase down: gated features return `{ allowed: false }`, free features return `{ allowed: true }`.

## Tasks / Subtasks

- [ ] Task 1: Migration 007 (AC: #1)
  - [ ] Create `supabase/migrations/007_feature_flags.sql`
  - [ ] Table schema as specified
  - [ ] INSERT 8 seed flags
  - [ ] RLS: SELECT public, INSERT/UPDATE/DELETE admin only

- [ ] Task 2: Feature flags library (AC: #2, #3, #7)
  - [ ] Create `lib/feature-flags.ts`:
    - `getFeatureFlags()`: fetch all, cache in module scope
    - `canAccess(flagKey, userPlan)`: check enabled + plan
    - Cache with 5min TTL, stale-while-revalidate
    - Fallback on error: gated=false, free=true

- [ ] Task 3: React hook (AC: #2, #4, #5)
  - [ ] Create `lib/hooks/use-feature-gate.ts`:
    ```typescript
    export function useFeatureGate(flagKey: string): { allowed: boolean; loading: boolean } {
      // Get user plan from useSubscriptionStore
      // Get flags from cache or fetch
      // Return { allowed: canAccess(flagKey, plan), loading }
    }
    ```

- [ ] Task 4: Server-side helper (AC: #6)
  - [ ] In `lib/feature-flags.ts`: `checkFeatureFlag(flagKey, userPlan)` — direct DB query
  - [ ] For API routes and server components

- [ ] Task 5: Subscription store (AC: #4)
  - [ ] Create `lib/stores/subscription-store.ts` (Zustand)
  - [ ] Provides `plan` of current user (loaded from `subscriptions` table)

## Dev Notes

### Architecture Reference
Implementation follows V2.3 of architecture: `lib/feature-flags.ts` with `getFeatureFlags()` and `canAccess()`.

### Files to Create
- New: `supabase/migrations/007_feature_flags.sql`
- New: `lib/feature-flags.ts`
- New: `lib/hooks/use-feature-gate.ts`
- New: `lib/stores/subscription-store.ts`

### Cache Pattern
```typescript
let flagCache: FeatureFlag[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getFlags(): Promise<FeatureFlag[]> {
  if (flagCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return flagCache;
  }
  // Fetch and update cache
  // On error, return stale cache or defaults
}
```

### Anti-Patterns
- **DON'T** use client cache for server-side checks — always query DB directly
- **DON'T** hardcode flag values — always read from table
- **DON'T** expose admin CRUD to non-admin users via RLS

### References
- [Source: _bmad-output/planning-artifacts/epics-v2-stories.md — Story 5.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — V2.3 Feature Flags]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, NFR29]

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
- supabase/migrations/017_subscriptions.sql
- supabase/migrations/018_feature_flags.sql
- lib/types/subscription.ts
- lib/feature-flags.ts
- lib/feature-flags-server.ts
- lib/stores/subscription-store.ts
- lib/hooks/use-feature-gate.ts
