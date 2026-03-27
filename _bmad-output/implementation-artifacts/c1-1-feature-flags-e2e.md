# Story C.1.1: Feature Flags E2E (Server + Client + Gate Hook)

Status: ready-for-dev

## Story

As a **developer**,
I want a complete feature flag system,
so that Pro features can be gated at both server and client level.

## Acceptance Criteria

1. `feature-flags-server.ts` reads flags from Supabase `feature_flags` table
2. `feature-flags.ts` client-side reads with 5-minute TTL cache
3. `use-feature-gate.ts` hook returns `{enabled, loading}` for any flag
4. Flags support plan-based gating: `free`, `pro`, `mesa`
5. Server-side RPC validates flag before allowing gated operations
6. Tests for all three layers
7. Flags configurable via admin dashboard

## Tasks / Subtasks

- [ ] Task 1: Complete server-side flags (AC: #1, #4)
- [ ] Task 2: Complete client-side with cache (AC: #2)
- [ ] Task 3: Complete hook (AC: #3)
- [ ] Task 4: Server RPC validation (AC: #5)
- [ ] Task 5: Admin UI (AC: #7)
- [ ] Task 6: Tests (AC: #6)

## Dev Notes

### Files to Modify/Create

- Modify: `lib/feature-flags-server.ts`
- Modify: `lib/feature-flags.ts`
- Modify: `lib/hooks/use-feature-gate.ts`

### Anti-Patterns

- **DON'T** check flags only client-side — server must validate too
- **DON'T** use flags for non-feature things (env config, etc.)

### References

- [Source: _bmad-output/implementation-artifacts/v2-5-1-feature-flag-system.md]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
