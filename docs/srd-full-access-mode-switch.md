# SRD Full Access Mode Switch

## Summary

Fix for a compendium access bug where an authenticated admin or beta tester could remain stuck on the public SRD dataset after the tab had already initialized with guest/public data.

## User Impact

- Admins with `users.is_admin = true` could still see only SRD-safe monsters and spells.
- Beta testers could appear locked out of "Completo" content even though backend access was correct.
- The issue was especially likely when the same browser tab loaded public data first and only later entered the authenticated app.

## Root Cause

The server-side gating was correct:

- `app/app/layout.tsx` already enabled `fullData` for `content_whitelist` users or admins.
- `app/api/srd/full/[...path]/route.ts` already allowed full bundle access for whitelist or admin users.

The failure was in the client store:

- `components/srd/SrdInitializer.tsx` updates `setFullDataMode(fullData)` and then calls `initializeSrd()`.
- `lib/stores/srd-store.ts` previously treated initialization as one-shot and returned early when monsters were already loaded.
- If the tab had already loaded the public dataset, the store kept the in-memory public snapshot and never reloaded the full dataset after auth context changed.

## Fix

`lib/stores/srd-store.ts` now tracks which data mode is loaded in memory:

- `public`
- `full`

Behavior after the fix:

1. Detect the requested mode using `isFullDataMode()`
2. Skip only when the store is already loaded for that same mode
3. If the mode changed, clear the in-memory snapshot and reload the correct dataset
4. Prevent deferred on-demand loads from mixing public and full datasets after a mode switch

## Tests

Regression coverage lives in:

- `lib/stores/srd-store.test.ts`

Key scenario covered:

- initialize with public data
- switch to full mode in the same tab
- verify the store reloads the full dataset instead of reusing the public snapshot

## Notes for Future Changes

- IndexedDB cache keys already separate `public` and `full` via `cacheSuffix()`
- In-memory state must always be kept mode-aware too
- Any auth-driven SRD access change should be treated as a dataset transition, not just a permission toggle
