---
story_key: 8-7-routing-navigation-cleanup
epic: 8
story_id: 8.7
status: ready-for-dev
created: 2026-03-24
updated: 2026-03-24
---

# Story 8.7: Routing, Navigation & Cleanup

## Story

As a **DM**,
I want all entry points (dashboard, direct URLs) to lead to the unified combat experience,
So that there are no dead routes or confusing navigation paths.

## Acceptance Criteria

- AC1: Given the dashboard, when the DM clicks "New Combat Session", then they navigate to the unified encounter page in pre-combat mode
- AC2: Given the URL `/app/session/new`, when accessed, then the unified page loads in fresh pre-combat mode (no DB hydration)
- AC3: Given the URL `/app/session/[id]`, when accessed with a valid session, then the unified page loads with DB hydration (pre-combat or active combat depending on state)
- AC4: Given the old `EncounterBuilder.tsx`, when this story is complete, then the file is deleted
- AC5: Given the old `InitiativeTracker.tsx`, when this story is complete, then the file is deleted
- AC6: Given the old `TiebreakerDragList.tsx`, when this story is complete, then the file is deleted (if not already deleted in 8.4)
- AC7: Given any remaining import of deleted components, when the project is built, then there are zero import errors
- AC8: Given the onboarding flow, when a new DM completes onboarding, then they are directed to the unified encounter page (not the old builder)
- AC9: Given the project builds successfully with `next build`, then zero TypeScript errors and zero dead imports

## Tasks / Subtasks

### Task 1: Route Updates
- [ ] 1.1 `/app/session/new/page.tsx` — renders the unified page component in fresh/pre-combat mode
- [ ] 1.2 `/app/session/[id]/page.tsx` — renders the unified page component with DB hydration
- [ ] 1.3 Both routes use the same underlying component (CombatSessionClient or new unified wrapper)

### Task 2: Dashboard Link Update
- [ ] 2.1 Update dashboard "New Combat Session" CTA to link to `/app/session/new`
- [ ] 2.2 Verify existing session links on dashboard still work (`/app/session/[id]`)

### Task 3: Onboarding Flow Update
- [ ] 3.1 If onboarding directs to encounter builder, update to use new route
- [ ] 3.2 Verify onboarding flow completes correctly with new page

### Task 4: Delete Deprecated Components
- [ ] 4.1 Delete `components/session/EncounterBuilder.tsx`
- [ ] 4.2 Delete `components/combat/InitiativeTracker.tsx`
- [ ] 4.3 Delete `components/combat/TiebreakerDragList.tsx` (if not done in 8.4)
- [ ] 4.4 Remove any associated test files for deleted components

### Task 5: Clean Up Imports & References
- [ ] 5.1 Search codebase for all imports of deleted components → remove
- [ ] 5.2 Remove any unused utility functions that were only used by deleted components
- [ ] 5.3 Run `next build` to verify zero TypeScript/import errors

### Task 6: Verification
- [ ] 6.1 `next build` succeeds with zero errors
- [ ] 6.2 All routes resolve correctly
- [ ] 6.3 No dead code remaining from old components

## Dev Notes

- This story is primarily cleanup. All new functionality should be done in Stories 8.1–8.6.
- The unified page component handles two modes based on URL: `/app/session/new` (fresh, no DB) and `/app/session/[id]` (hydrate from DB).
- Be careful with the onboarding flow — check `app/app/onboarding/` if it references the old encounter builder.
- Run `next build` as the final gate — it catches dead imports and type errors.
- Delete deprecated test files too: `InitiativeTracker.test.tsx`, any `TiebreakerDragList` tests, `EncounterBuilder` tests (if they exist separately).
