# Story 2.5: Account Deletion & Data Erasure

Status: done

## Story

As a **user**,
I want to permanently delete my account and all associated data,
so that my right to data erasure under LGPD/GDPR is respected.

## Acceptance Criteria

1. **Given** a logged-in user at `/app/settings`,
   **When** they click "Delete Account",
   **Then** a confirmation dialog warns that ALL data (campaigns, player characters, encounters, sessions) will be permanently deleted.

2. **Given** the user confirms deletion in the dialog,
   **When** the deletion is processed,
   **Then** the user's account, all campaigns, player characters, sessions, encounters, combatants, and session tokens are permanently removed from the database.

3. **Given** successful deletion,
   **When** the process completes,
   **Then** the user is signed out and redirected to the landing page (`/`).

4. **Given** the user cancels the deletion dialog,
   **When** they dismiss the confirmation,
   **Then** no data is deleted and they remain on the settings page.

5. **Given** a logged-in user navigating the app,
   **When** they look at the nav or `/app/settings`,
   **Then** there is an accessible link to reach the settings page.

## Tasks / Subtasks

- [x] **Task 1: Create `app/api/account/delete/route.ts`** (AC: 2, 3)
  - [x] POST handler — verify request is from an authenticated user (use `createClient` from server)
  - [x] Call `supabase.auth.admin.deleteUser(user.id)` using a Supabase Admin client (service role key)
  - [x] DB cascade handles deletion of all related data (see Dev Notes)
  - [x] Return `{ success: true }` on success, or `{ error: "..." }` with appropriate HTTP status on failure
  - [x] Do NOT expose service role key to client — this route is server-side only

- [x] **Task 2: Create `app/app/settings/page.tsx`** (AC: 1, 5)
  - [x] Server Component — auth check, redirect to `/auth/login` if no user
  - [x] Render `<AccountDeletion>` client component (passing `userId` is NOT needed — the API route re-verifies auth)
  - [x] Page heading: "Account Settings"

- [x] **Task 3: Create `components/settings/AccountDeletion.tsx`** (AC: 1, 2, 3, 4)
  - [x] `"use client"` component with a "Delete Account" button
  - [x] Clicking the button opens a confirmation `<AlertDialog>` (shadcn/ui)
  - [x] Dialog warns: "This will permanently delete your account and all your campaigns, player characters, and session history. This cannot be undone."
  - [x] On confirm: POST to `/api/account/delete`, then call `supabase.auth.signOut()`, then `router.push('/')`
  - [x] Show loading state during the deletion; disable button to prevent double-submit
  - [x] On error: show inline error message (not Toast)

- [x] **Task 4: Add Settings link to navigation** (AC: 5)
  - [x] In `app/app/layout.tsx` — add a "Settings" link in the nav bar pointing to `/app/settings`
  - [x] Use minimal, non-intrusive styling (e.g., `text-white/50 hover:text-white text-sm`)
  - [x] Do NOT break existing nav bar layout

- [x] **Task 5: Write tests for `AccountDeletion`** (AC: 1–4)
  - [x] File: `components/settings/AccountDeletion.test.tsx`
  - [x] Test: renders "Delete Account" button
  - [x] Test: clicking button opens confirmation dialog
  - [x] Test: confirmation dialog shows warning text
  - [x] Test: cancel button closes dialog without calling API
  - [x] Test: confirm button POSTs to `/api/account/delete` then signs out and navigates to `/`
  - [x] Test: shows loading state during deletion
  - [x] Test: shows error message if API returns error
  - [x] Mock: `fetch`, `@/lib/supabase/client`, `next/navigation`

- [x] **Task 6: Update sprint-status.yaml**
  - [x] Change `2-5-account-deletion-and-data-erasure` → `in-progress` when starting, `review` on completion

## Dev Notes

### Why a Server-Side API Route is Required

Deleting a Supabase Auth user requires the **service role key** (not the anon/publishable key). The service role key must NEVER be exposed to the browser. Therefore:
- An API Route Handler (`app/api/account/delete/route.ts`) runs on the server
- It uses a Supabase Admin client initialized with `SUPABASE_SERVICE_ROLE_KEY`
- The client component calls this route via `fetch('/api/account/delete', { method: 'POST' })`

### Database Cascade — All Data Deleted Automatically

The schema has cascaded deletes set up:

```
auth.users (deleted by admin API)
  └── users (ON DELETE CASCADE from auth.users)
        └── campaigns (ON DELETE CASCADE from users)
              └── player_characters (ON DELETE CASCADE from campaigns)
        └── sessions (ON DELETE CASCADE from users via owner_id)
              └── encounters (ON DELETE CASCADE from sessions)
                    └── combatants (ON DELETE CASCADE from encounters)
              └── session_tokens (ON DELETE CASCADE from sessions)
```

No manual deletion of child records is needed — deleting the `auth.users` row triggers everything.

### API Route Implementation

```ts
// app/api/account/delete/route.ts
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  // 1. Verify the caller is authenticated
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Create admin client with service role (server-only)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 3. Delete the user (cascades all data)
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

### Environment Variable

`SUPABASE_SERVICE_ROLE_KEY` must be added to `.env.local`. It is found in your Supabase project dashboard under **Settings → API → service_role secret**.

```
# .env.local (add this)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**CRITICAL: Never prefix with `NEXT_PUBLIC_` — this key must remain server-side only.**

### AccountDeletion Client Component

```tsx
// components/settings/AccountDeletion.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function AccountDeletion() {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to delete account')
      }
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setIsDeleting(false)
    }
  }

  return (
    <div className="mt-8 p-6 bg-[#16213e] rounded-lg border border-red-900/30">
      <h2 className="text-white font-semibold mb-2">Danger Zone</h2>
      <p className="text-white/50 text-sm mb-4">
        Permanently delete your account and all associated data. This cannot be undone.
      </p>
      {error && (
        <p className="text-red-400 text-sm mb-4" role="alert">{error}</p>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-[#16213e] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This will permanently delete your account and all your campaigns, player characters,
              and session history. <strong className="text-white">This cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/10 hover:bg-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Yes, delete everything'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

### Settings Page

```tsx
// app/app/settings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountDeletion } from '@/components/settings/AccountDeletion'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-white mb-2">Account Settings</h1>
      <p className="text-white/50 text-sm mb-8">Manage your account preferences and data.</p>
      <AccountDeletion />
    </div>
  )
}
```

### Adding Settings Link to Nav

In `app/app/layout.tsx`, add a Settings link in the existing nav bar. Current nav has RPG Tracker brand + Dashboard link + LogoutButton. Add Settings between Dashboard and LogoutButton:

```tsx
<Link href="/app/settings" className="text-white/50 hover:text-white text-sm transition-colors">
  Settings
</Link>
```

Check the exact nav structure in `app/app/layout.tsx` before editing — insert the link without breaking layout.

### shadcn/ui Components Needed

- `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger` — from `@/components/ui/alert-dialog`
- `Button` — from `@/components/ui/button`

Check if `alert-dialog` is installed in `components/ui/`. If not, install via: `npx shadcn@latest add alert-dialog`

### Type Imports

No custom type imports needed for this story — uses standard Supabase auth types.

### Anti-Patterns — NEVER DO

- Do NOT call `supabase.auth.admin.deleteUser()` from a client component — always via API route
- Do NOT expose `SUPABASE_SERVICE_ROLE_KEY` to the client (never use `NEXT_PUBLIC_` prefix)
- Do NOT skip the auth check in the API route — verify the user is authenticated before deletion
- Do NOT delete child records manually — the DB cascade handles all of it
- Do NOT use `router.push('/')` before `supabase.auth.signOut()` completes — await sign-out first
- Do NOT show a Toast for the deletion — use inline error state

### Files to Create / Modify

- `app/api/account/delete/route.ts` — NEW: POST handler for account deletion
- `app/app/settings/page.tsx` — NEW: Server Component settings page
- `components/settings/AccountDeletion.tsx` — NEW: client component with delete flow
- `components/settings/AccountDeletion.test.tsx` — NEW: unit tests
- `app/app/layout.tsx` — MODIFY: add Settings link to nav bar
- `.env.local` — ADD: `SUPABASE_SERVICE_ROLE_KEY` (user must add this manually from Supabase dashboard)

### References

- Acceptance Criteria: `_bmad-output/planning-artifacts/epics.md` → Epic 2, Story 2.5
- DB cascade schema: `supabase/migrations/001_initial_schema.sql`
- Auth trigger: `supabase/migrations/006_auth_user_trigger.sql`
- Auth layout (for nav update): `app/app/layout.tsx`
- Supabase Admin API docs: https://supabase.com/docs/reference/javascript/auth-admin-deleteuser

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Test: `getByText(/permanently delete your account/i)` matched both the static description paragraph and the dialog description — fixed by scoping assertion with `within(dialog)`.

### Completion Notes List

- Tasks 1–3 were already implemented from a prior session; verified all files match the story spec exactly.
- Task 4: Added Settings link to `app/app/layout.tsx` nav bar between Dashboard and LogoutButton, using `text-white/50 hover:text-white text-sm transition-colors` styling.
- Task 5: Created 7 unit tests covering all required scenarios (render, open dialog, warning text, cancel, confirm+signout+redirect, loading state, error display). All 7 pass. Full suite: 147 tests, 0 regressions.
- `alert-dialog` shadcn component was already installed at `components/ui/alert-dialog.tsx`.

### File List

- `app/api/account/delete/route.ts` — NEW: POST handler for account deletion (server-side, service role key)
- `app/app/settings/page.tsx` — NEW: Server Component settings page with auth guard
- `components/settings/AccountDeletion.tsx` — NEW: Client component with AlertDialog delete flow
- `components/settings/AccountDeletion.test.tsx` — NEW: 7 unit tests for AccountDeletion
- `app/app/layout.tsx` — MODIFIED: Added Settings nav link
- `_bmad-output/implementation-artifacts/2-5-account-deletion-and-data-erasure.md` — MODIFIED: story tracking

## Change Log

- 2026-03-24: Implemented Story 2.5 — account deletion API route, settings page, AccountDeletion component, nav link, and full unit test suite (7 tests). All ACs satisfied.
